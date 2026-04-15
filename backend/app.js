const express = require('express');
const logger = require('./middlewares/logger');
const cors = require('cors');
require('dotenv').config();
const { connectToDB } = require('./config/db');

// function Connnection To Database
connectToDB();

// Init App
const app = express();

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

// Health Check Endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

//Error Handler Middlewares
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.log(err);
  res.status(statusCode).json({ message: err.message });
});

// Running Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${port}`,
  );
});

module.exports = app;
