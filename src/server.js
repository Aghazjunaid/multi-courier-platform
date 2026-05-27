require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  require('./queues/workers/order.worker');
  require('./jobs/reconciliation.job');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
