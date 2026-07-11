const express = require('express');
const logger = require('./middlewares/logger');
const cors = require('cors');
require('dotenv').config();
const { connectToDB } = require('./config/db');

const paymentController = require('./controllers/payment.controller');

// Init App
const app = express();

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook,
);

app.use(express.json());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

//Apply Middlewares
app.use(logger);

//Routers
app.use('/api/', require('./routes/templates'));
app.use('/api/', require('./routes/creators'));
app.use('/api/', require('./routes/auth'));
app.use('/api/', require('./routes/profile'));
app.use('/api/', require('./routes/users'));
app.use('/api/', require('./routes/password'));
app.use('/api/', require('./routes/orders'));
app.use('/api/', require('./routes/payments'));
app.use('/api/', require('./routes/subscriptions'));
app.use('/api/', require('./routes/wishlist'));
app.use('/api/', require('./routes/reviews'));
app.use('/api/', require('./routes/downloads'));
app.use('/api/', require('./routes/licenses'));

// Friendly roots (this process is API-only; the Next.js app is a separate server)
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Craftify API',
    message:
      'This is the backend only. Open your Next.js frontend (usually another port) for the website.',
    apiOverview: '/api/',
    tip: 'If the frontend also tries to use port 3000, set PORT=5000 in backend/.env or change NEXT_PUBLIC_API_URL on the frontend.',
  });
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.get('/api/', (_req, res) => {
  res.status(200).json({
    service: 'Craftify REST API',
    examples: [
      'GET /api/templates',
      'GET /api/creators',
      'POST /api/auth/login',
      'GET /api/orders/my',
    ],
  });
});

//Error Handler Middlewares
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode =
    err.statusCode &&
    Number(err.statusCode) >= 400 &&
    Number(err.statusCode) < 600
      ? Number(err.statusCode)
      : res.statusCode === 200
        ? 500
        : res.statusCode;
  console.log(err);
  res.status(statusCode).json({ message: err.message });
});

// Running Server
const port = process.env.PORT || 3000;

async function start() {
  try {
    // function Connnection To Database
    await connectToDB();

    app.listen(port, () => {
      console.log(
        `Server is running in ${process.env.NODE_ENV} mode on port ${port}`,
      );
    });
  } catch (err) {
    console.error('Fatal: failed to start server due to DB connection error');
    console.error(err);
    process.exit(1);
  }
}

start();

module.exports = app;
