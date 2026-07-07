# Craftify API

A RESTful backend API for Craftify built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.

This project follows a clean structure with **Routes** for HTTP definitions, **Controllers** for business logic, and **Middleware** for authentication/authorization.

## Features

- Authentication
  - Register
  - Login (JWT)
- Role-based access control (RBAC)
  - Roles stored on the user as `roles: ['user', 'admin', 'moderator']`
  - Permission checks via middleware
- Templates CRUD
- Creators CRUD
- Users management

## Tech Stack

- Node.js / Express
- MongoDB + Mongoose
- JWT Authentication
- Joi validation
- express-async-handler

## Project Structure

```

craftify-templates-marketplac/
  controllers/
  middlewares/
  models/
  routes/
  scripts/
  app.js
```

## Environment Variables

Create a `.env` file in the project root:

```
PORT=3000
MONGO_URL=mongodb://localhost/bookStoreDB
JWT_SECRET_KEY=your_secret_key
```

## Installation

```
npm install
```

## Run (Development)

```
npm start
```

The server will start on:

- `http://localhost:3000`

## API Endpoints (Summary)

Base path: `/api`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile` (protected)

### Templates

- `GET /api/templates`
- `GET /api/templates/:id`
- `POST /api/templates` (protected: `templates:write`)
- `PUT /api/templates/:id` (protected: `templates:write`)
- `DELETE /api/templates/:id` (protected: `templates:delete`)

### Creators

- `GET /api/creators`
- `GET /api/creators/:id`
- `POST /api/creators` (protected: `creators:write`)
- `PUT /api/creators/:id` (protected: `creators:write`)
- `DELETE /api/creators/:id` (protected: `creators:delete`)

### Users

- `GET /api/users` (protected: `users:read`)
- `GET /api/users/:id` (protected: `users:read`)
- `PUT /api/users/:id` (protected: `users:write`)
- `DELETE /api/users/:id` (protected: `users:delete`)

## Database Migration (Old `isAdmin` -> New `roles`)

If you have existing data using `isAdmin`, you can migrate to the new `roles` system:

- Migrate users:

```
npm run migrate:users
```

- Migrate creators:

```
npm run migrate:creators
```

- Migrate all:

```
npm run migrate:all
```

## Notes

- Ensure MongoDB is running locally before starting the server.
- After changing roles/permissions, re-login to get a fresh JWT that contains updated `roles`.

## License

ISC
