require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes        = require('./routes/authRoutes');
const goalRoutes        = require('./routes/goalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');

connectDB();

const app = express();


app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}


app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.use('/api/auth',         authRoutes);
app.use('/api/goals',        goalRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard',    dashboardRoutes);


app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`SaveMore API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = app;
