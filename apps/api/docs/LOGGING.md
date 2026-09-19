# Logging Documentation

## Overview

TrendVaulta API implements a professional, production-grade logging system using **Pino** for high-performance, structured logging.

### Why Pino?

- **Performance**: Fastest Node.js logger (10x+ faster than Winston)
- **JSON-native**: Perfect for log aggregation systems (ELK, Datadog, etc.)
- **Low overhead**: Asynchronous, non-blocking logging
- **Built-in serializers**: Automatic serialization for common objects
- **Child loggers**: Context propagation across the application

## Features

- **Structured logging**: JSON format for production, pretty-printed for development
- **Multiple log levels**: error, warn, info, debug
- **Request/response logging**: Automatic HTTP request logging with timing
- **Sensitive data redaction**: Automatic masking of passwords, tokens, etc.
- **Request tracking**: Unique request IDs for tracing
- **User context**: Automatic inclusion of user ID when authenticated
- **Error logging**: Detailed error logging with stack traces (dev only)

## Architecture

### Components

1. **Logger Utility** (`utils/logger.js`)
   - Pino-based logger with configuration
   - Child logger support for context propagation
   - Sensitive data redaction

2. **Request Logger Middleware** (`middlewares/requestLogger.js`)
   - Automatic HTTP request/response logging
   - Request ID generation for tracing
   - Response time tracking

3. **Logging Configuration** (`config/logging.config.js`)
   - Environment-specific settings
   - Log level configuration
   - Sensitive field redaction rules

4. **Error Handler Integration** (`middlewares/errorHandler.js`)
   - Error logging with context
   - Structured error responses

## Configuration

### Environment Variables

```bash
# Log level hierarchy: error < warn < info < debug
LOG_LEVEL=info

# Enable pretty-printed logs (development)
LOG_PRETTY=true

# Write logs to file (production)
LOG_FILE=true

# Log directory
LOG_DIR=./logs
```

### Configuration File

Logging is configured in `config/logging.config.js`:

```javascript
module.exports = {
  level: 'info',
  pretty: true, // Development
  file: {
    enabled: true, // Production
    dir: './logs',
    errorFile: 'error.log',
    combinedFile: 'combined.log',
  },
  redact: {
    fields: ['password', 'token', 'apiKey', 'secret', ...],
    replacement: '[REDACTED]',
  },
  baseContext: {
    service: 'trendvaulta-api',
    environment: 'development',
    version: '1.0.0',
  },
};
```

## Usage

### Basic Logging

```javascript
const logger = require('../utils/logger');

// Log levels
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit exceeded', { ip: req.ip, userId: req.user?.id });
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.debug('Processing request', { method: req.method, url: req.url });
```

### Child Loggers (Context Propagation)

```javascript
const logger = require('../utils/logger');

// Create a child logger with additional context
const orderLogger = logger.child({ module: 'orders', orderId: '123' });

orderLogger.info('Order created', { total: 99.99 });
// Output includes: module, orderId, and all base context
```

### Request Logging

Request logging is automatic via the `requestLogger` middleware in `app.js`:

```javascript
const requestLogger = require('./middlewares/requestLogger');
app.use(requestLogger);
```

This automatically logs:
- Request method and URL
- Response status code
- Response time
- User ID (if authenticated)
- Request ID (for tracing)

### Error Logging

Errors are automatically logged by the `errorHandler` middleware:

```javascript
const logger = require('../utils/logger');

try {
  // Some operation
} catch (err) {
  logger.error('Operation failed', {
    error: err.message,
    stack: err.stack,
    context: { userId: req.user?.id },
  });
  throw err;
}
```

## Log Format

### Development (Pretty-Printed)

```
[2024-01-15 10:30:45] INFO: User logged in
  userId: "123"
  email: "user@example.com"
  service: "trendvaulta-api"
  environment: "development"
```

### Production (JSON)

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:45.123Z",
  "msg": "User logged in",
  "userId": "123",
  "email": "user@example.com",
  "service": "trendvaulta-api",
  "environment": "production",
  "version": "1.0.0"
}
```

## Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **error** | Critical errors requiring immediate attention | Database connection failed, payment processing error |
| **warn** | Warning messages that don't stop execution | Rate limit exceeded, deprecated API usage |
| **info** | General informational messages | User logged in, order created |
| **debug** | Detailed debugging information (dev only) | Request processing details, variable values |

## Sensitive Data Redaction

The logger automatically redacts sensitive fields from logs:

**Redacted Fields:**
- password
- token
- accessToken
- refreshToken
- apiKey
- secret
- creditCard
- cvv
- ssn
- authorization
- cookie

**Example:**
```javascript
logger.info('User login attempt', {
  email: 'user@example.com',
  password: 'secret123', // Will be redacted to [REDACTED]
});

// Output:
{
  "email": "user@example.com",
  "password": "[REDACTED]"
}
```

## Request Tracing

Each request gets a unique ID for tracing:

```javascript
// Request ID is automatically generated
req.id = 'req-1705327845123-abc123xyz'

// Use in logs
logger.info('Processing request', { requestId: req.id });
```

## Best Practices

1. **Use Appropriate Log Levels**
   - `error`: Only for critical errors
   - `warn`: For issues that don't stop execution
   - `info`: For significant events
   - `debug`: For detailed debugging (dev only)

2. **Include Context**
   - Always include relevant context (userId, orderId, etc.)
   - Use child loggers for module-specific context

3. **Avoid Sensitive Data**
   - Never log passwords, tokens, or PII
   - Use the redaction feature for sensitive fields

4. **Structure Logs**
   - Use structured data (objects) instead of string concatenation
   - This makes logs searchable and filterable

5. **Performance**
   - Logging is asynchronous and non-blocking
   - Avoid excessive logging in hot paths

## Log Aggregation

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. **Filebeat Configuration** (`filebeat.yml`):

```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/logs/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

2. **Kibana**: Visualize logs with filters and dashboards

### Datadog

```javascript
// Install datadog-pino
const pino = require('pino');
const pinoDatadog = require('pino-datadog');

const logger = pino({
  transport: {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: 'trendvaulta-api',
    },
  },
});
```

### CloudWatch (AWS)

```javascript
// Install pino-cloudwatch
const pino = require('pino');
const pinoCloudWatch = require('pino-cloudwatch');

const logger = pino({
  transport: {
    target: 'pino-cloudwatch',
    options: {
      logGroupName: '/aws/trendvaulta-api',
      logStreamName: 'production',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: 'us-east-1',
    },
  },
});
```

## Troubleshooting

### Logs Not Appearing

1. Check log level: Ensure `LOG_LEVEL` is set correctly
2. Check logger import: Verify correct path to logger utility
3. Check middleware order: Ensure `requestLogger` is before routes

### Sensitive Data in Logs

1. Add field to redaction list in `config/logging.config.js`
2. Use child loggers with sanitized context
3. Avoid logging raw request bodies

### Performance Issues

1. Reduce log level to `warn` or `error` in production
2. Disable debug logs
3. Use async logging (already enabled by default)

## Monitoring and Alerting

### Error Rate Monitoring

Set up alerts based on error logs:

```javascript
// Example: Alert if error rate > 5% in 5 minutes
// Can be implemented with log aggregation tools
```

### Critical Error Alerts

Alert on specific error patterns:

```javascript
// Example: Alert on payment errors
if (log.message.includes('payment') && log.level === 'error') {
  sendAlert('Payment processing error detected');
}
```

## Migration from Console.log

### Before

```javascript
console.log('User logged in', userId);
console.error('Database error', err);
```

### After

```javascript
const logger = require('../utils/logger');

logger.info('User logged in', { userId });
logger.error('Database error', { error: err.message });
```

## Future Enhancements

- [ ] Implement log rotation with file size limits
- [ ] Add structured error codes
- [ ] Implement distributed tracing (OpenTelemetry)
- [ ] Add log sampling for high-traffic endpoints
- [ ] Implement log-based metrics
- [ ] Add real-time log streaming dashboard

## Support

For issues or questions about logging, contact the development team or create an issue in the repository.
