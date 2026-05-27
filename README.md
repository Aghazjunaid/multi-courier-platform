# Multi Courier Integration Platform

Production-grade courier aggregation platform using:

- Express.js
- MongoDB
- BullMQ
- Redis
- UrbaneBolt APIs

---

# Features

## Unified APIs

Single API contract for all couriers.

## Pluggable Architecture

Adding new courier requires:

- creating adapter
- registering in factory

No controller/service changes.

## Async Bulk Processing

BullMQ handles:

- concurrency
- retries
- scalability

## Idempotency Safe

Uses:

- unique DB index
- placeholder PROCESSING row

Prevents duplicate shipment creation.

## Tracking Persistence

Append-only tracking history.

## Automatic Re-authentication

401 errors automatically:

- refresh token
- retry request

---

# APIs

## Health Check

GET /health

## Create Order

POST /api/v1/orders

## Track Order

GET /api/v1/orders/:id/track

## Cancel Order

POST /api/v1/orders/:id/cancel

## Bulk Orders

POST /api/v1/orders/bulk

Accepts up to 100 orders. Returns `202` with a `batch_id` immediately and
processes orders asynchronously via BullMQ. Each order may use a different
`courier_partner`.

## Bulk Batch Status

GET /api/v1/orders/bulk/:batchId

Poll this with the `batch_id` from the bulk response to get per-order
results. Returns aggregate counts plus a `status` of `PROCESSING`,
`COMPLETED`, `PARTIAL_SUCCESS`, or `FAILED`, and a per-order `items` array:

```json
{
  "success": true,
  "message": "Batch status fetched",
  "data": {
    "batch_id": "…",
    "status": "PARTIAL_SUCCESS",
    "total_orders": 100,
    "success_count": 95,
    "failed_count": 5,
    "items": [
      { "order_id": "ORD-1", "status": "SUCCESS", "awb_number": "AWB-…", "deduplicated": false },
      { "order_id": "ORD-2", "status": "FAILED", "reason": "Courier service timed out" }
    ]
  }
}
```

`deduplicated: true` marks an order whose `order_id` already existed — no
second shipment was created (idempotency).

---

# Error Responses

All endpoints return a single normalized error shape:

```json
{
  "success": false,
  "error": {
    "code": "COURIER_TIMEOUT",
    "message": "Courier service timed out",
    "request_id": "uuid",
    "details": {}
  }
}
```

Codes include: `VALIDATION_ERROR`, `INVALID_COURIER`, `ORDER_NOT_FOUND`,
`COURIER_TIMEOUT`, `COURIER_AUTH_FAILED`, `COURIER_VALIDATION_ERROR`,
`COURIER_UNAVAILABLE`, `COURIER_UNKNOWN`, `SHIPMENT_CREATE_FAILED`,
`INTERNAL_SERVER_ERROR`. The courier's raw error is never leaked to the
client — it is persisted on the order and in logs only.

---

# Background Jobs

## Reconciliation Cron

A BullMQ repeatable job (`reconciliation-queue`) runs every 15 minutes
(`*/15 * * * *`) and reconciles orders left in a failed-but-recoverable
state.

It picks up orders where `reconciliationRequired: true` and `retryCount < 3`
— set when a shipment fails due to a transient courier error
(`COURIER_TIMEOUT` / `COURIER_UNAVAILABLE`). For each, it re-queries the
courier's tracking API:

- **success** → updates `currentStatus` and clears `reconciliationRequired`
- **failure** → increments `retryCount`, records `failureReason` and
  `lastRetryAt`; after 3 attempts the order is given up on (super-admin
  notification hook)

The job is wired up automatically on server start — no separate process
required.

---

# Setup

```bash
npm install
```

Create .env file.

```bash
npm run dev
```

---

# Docker

```bash
docker-compose up
```

---

# Add New Courier

1. Create adapter class
2. Extend BaseCourier
3. Register in CourierFactory

No other changes required.
