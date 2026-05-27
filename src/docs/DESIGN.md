# Design — Multi Courier Integration Platform

## 1. Overview

A courier-aggregation service that exposes one unified API contract for
creating, tracking, and cancelling shipments across multiple courier
partners (currently UrbaneBolt + a Mock courier for testing). Bulk order
creation is processed asynchronously, and failed shipments are
self-healed by a background reconciliation job.

**Stack:** Express.js · MongoDB (Mongoose) · Redis + BullMQ · Winston ·
Joi · Axios.

---

## 2. Architecture

Layered, with a clear request path:

```
HTTP  →  Routes  →  Validation MW  →  Controller  →  Service
                                                        │
                                          ┌─────────────┼──────────────┐
                                          │             │              │
                                    CourierFactory   Models       BullMQ Queue
                                          │         (Mongo)            │
                                   Courier Adapter            ┌────────┴────────┐
                                   (UrbaneBolt / Mock)    Order Worker   Reconciliation
                                          │                                  Cron
                                    Courier HTTP API
```

- **Routes** map URLs to controllers and attach Joi validation.
- **Controllers** are thin — translate HTTP ↔ service calls, never contain
  business logic.
- **Services** (`OrderService`, `BulkOrderService`) hold business logic and
  orchestrate models + couriers.
- **Courier adapters** encapsulate each partner's auth, payload mapping, and
  error quirks behind a common interface.
- **Queues/workers** decouple slow courier calls from the HTTP request.

Cross-cutting concerns: a `requestId` middleware seeds an **AsyncLocalStorage**
context so every layer (and background worker) can log a correlating
`request_id` without threading it through function signatures.

---

## 3. Design Patterns (and why)

### Factory Pattern — `CourierFactory`

```js
CourierFactory.getCourier('urbanebolt'); // → singleton adapter instance
```

Callers select a courier at runtime by string without knowing concrete
classes. Adding a courier = write an adapter + add one `case`. No controller
or service changes. Unknown partners throw a typed `INVALID_COURIER` error
listing supported couriers.

### Adapter Pattern — `BaseCourier` + concrete couriers

Every courier extends `BaseCourier` (`authenticate`, `createShipment`,
`trackShipment`, `cancelShipment`). Each adapter normalizes its partner's
wildly different request/response shapes into our internal contract, so the
service layer is courier-agnostic. UrbaneBolt's quirks (token auth, status
code maps, batch-style responses) stay isolated in its adapter.

### Service Layer

Business rules (idempotency, status transitions, tracking persistence,
failure handling) live in services — reusable from both HTTP controllers and
queue workers.

### Queue-based async processing — BullMQ

Bulk creation of 100 orders sequentially in one HTTP request would block for
minutes and tie up an Express worker. Instead the endpoint persists a `Batch`,
enqueues N jobs, and returns `202 { batch_id }` immediately. A worker pool
(`WORKER_CONCURRENCY`, default 20) drains the queue. Redis-backed jobs survive
restarts and give back-pressure for free.

### Normalized error model — `ApiError`

A single error class carries `statusCode`, `code`, `details`, and `cause`.
One Express error handler renders every error in one shape. The raw upstream
(courier) message lives only in `cause` → persisted to the DB and logs, never
returned to the client.

---

## 4. Database Schema (MongoDB)

### `orders`
| Field | Type | Notes |
|---|---|---|
| internalOrderId | String | **unique index** — idempotency key |
| courierPartner | String | `urbanebolt` / `mock` |
| courierOrderId | String | courier's order ref |
| awbNumber | String | airway bill number |
| currentStatus | String (enum) | `PROCESSING`→`CREATED`→…→`DELIVERED`/`CANCELLED`/`FAILED` |
| requestPayload / responsePayload | Object | full audit of in/out |
| failureReason | String | raw upstream cause (forensics) |
| retryCount / lastRetryAt | Number / Date | reconciliation bookkeeping |
| reconciliationRequired | Boolean | set on transient courier failure |

### `trackinghistories`
Append-only log: `orderId` (ref), `status`, `rawPayload`, timestamps. Gives a
full status timeline per order.

### `batches`
Bulk run summary: `batchId` (unique), `totalOrders`, `successCount`,
`failedCount`, `status` (`PROCESSING`/`COMPLETED`/`PARTIAL_SUCCESS`/`FAILED`).

### `batchitems`
Per-order outcome within a batch: `batchId` (index), `orderId`, `status`
(`SUCCESS`/`FAILED`), `awbNumber`, `reason`, `deduplicated`. Powers the
partial-success report on `GET /orders/bulk/:batchId`.

---

## 5. Key Flows

**Idempotency.** `internalOrderId` is uniquely indexed. `createOrder` first
inserts a `PROCESSING` placeholder; a duplicate insert hits the unique
constraint (`E11000`), and we return the existing order flagged
`deduplicated: true` instead of calling the courier again. No double
shipments — even under concurrent bulk submission.

**Error handling.** Validation → `400 VALIDATION_ERROR` (field list). Courier
4xx → normalized `COURIER_*` codes, raw error hidden. Courier 5xx / timeout /
network → retried with exponential backoff (`retry.js`, configurable), then
persisted as `FAILED` with `reconciliationRequired: true`. Courier 401 →
automatic re-auth + one retry inside the adapter.

**Reconciliation.** A BullMQ repeatable job (every 15 min) re-queries tracking
for orders stuck in transient failure, recovering them or backing off after 3
attempts. Only transient codes (`COURIER_TIMEOUT`/`COURIER_UNAVAILABLE`) get
flagged — a 4xx rejection won't be pointlessly retried.

---

## 6. Trade-offs

- **MongoDB over PostgreSQL.** Chosen for schema-flexible storage of varied
  courier payloads and fast iteration. Cost: no cross-document transactions —
  acceptable here because each order is independent and idempotency is
  enforced by a unique index rather than a transaction. A high-volume,
  financially-strict deployment would favor Postgres.

- **Fire-and-poll bulk, not streaming.** Returning `202 + batch_id` keeps the
  API responsive and restart-safe, but the caller must poll
  `GET /orders/bulk/:batchId`. Streaming (SSE/WebSocket) would give push
  updates at the cost of more complexity and stateful connections.

- **AsyncLocalStorage for request context.** Avoids polluting every signature
  with `requestId`, at the cost of a small amount of "magic." Standard pattern
  (OpenTelemetry/Pino use it), native to Node.

- **Singleton courier instances.** One adapter instance per courier caches the
  auth token across requests. Simple and efficient for a single process; a
  multi-instance deployment would want a shared token cache (e.g. Redis) to
  avoid redundant re-auth.

- **Sequential `queue.add` loop.** Fine for ≤100 orders (~100ms). Beyond
  ~1000, switch to BullMQ `addBulk`.

- **In-process workers.** The bulk worker and reconciliation cron run inside
  the API process for simplicity. For scale, move them to dedicated worker
  processes/containers sharing the same Redis.
