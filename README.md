# Fountain WebApp — Modern Full‑Stack Template Marketplace

A professional, production‑ready template marketplace built with **Next.js 16 (App Router)**, **Node.js/Express**, and **MongoDB**. Designed for creators to showcase, sell, and manage digital templates with a polished, responsive UI and robust authentication system.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

---

## 🌟 Key Features

### 🎨 Frontend (Next.js)

- **Modern App Router** architecture with TypeScript
- **Responsive Design** optimized for all devices:
  - Mobile‑first bottom navigation with "More" menu pattern
  - Professional animations with Framer Motion
  - Beautiful glassmorphism UI with TailwindCSS
- **Component Library** built on Radix UI primitives:
  - Accessible dropdowns, dialogs, accordions, tabs
  - Custom form components with Zod validation
- **State Management**:
  - TanStack Query for server state synchronization
  - Zustand for client‑side state (cart, UI preferences)
- **Authentication & Authorization**:
  - JWT‑based auth with cookie persistence
  - Role‑based route protection via Next.js middleware
  - Complete auth flows: Login, Register, Profile, Logout
- **Template Management**:
  - Browse templates with advanced filtering
  - Template detail pages with creator profiles
  - Shopping cart and checkout flow
  - Order history and management

### 🚀 Backend (Node.js/Express)

- **RESTful API** with Express.js and async handlers
- **MongoDB Integration** with Mongoose ODM
- **Security & Authentication**:
  - JWT stateless authentication
  - bcryptjs for password hashing
  - Role‑based access control (user, admin, moderator)
- **Email Services**:
  - Password reset flow with Nodemailer
  - SMTP support (Gmail or custom provider)
  - Secure token generation with dynamic secrets
- **Data Validation** with Joi schemas
- **CORS** configuration for cross‑origin requests

---

## 🛠 Tech Stack

### Frontend

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 4.x
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion 12.x
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios with interceptors
- **State Management**: TanStack Query + Zustand
- **Auth Cookies**: js-cookie

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose 8.x
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Email**: Nodemailer
- **Development**: Nodemon

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  • App Router with Server Components                         │
│  • Client Components with React 19                          │
│  • Middleware for Route Protection                          │
│  • API Routes (Next.js rewrites to backend)                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                      │
├─────────────────────────────────────────────────────────────┤
│  • RESTful API under /api                                    │
│  • JWT Authentication Middleware                             │
│  • MongoDB Connection & Models                              │
│  • Email Service Integration                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (MongoDB)                        │
├─────────────────────────────────────────────────────────────┤
│  • Users (Authentication & Roles)                           │
│  • Templates (Digital Products)                             │
│  • Creators (Template Authors)                              │
│  • Orders (Purchase Records)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

1. **User Registration/Login**
   - Credentials validated against MongoDB
   - JWT token generated with user ID and roles
   - Token stored in non‑httpOnly cookies for client access

2. **API Authentication**
   - Axios interceptor automatically attaches `Authorization: Bearer <token>`
   - Backend middleware verifies JWT on protected routes

3. **Route Protection**
   - Next.js middleware checks cookies on navigation
   - Automatic redirects to login/unauthorized based on role

4. **Password Reset**
   - User requests reset → email with secure link sent
   - Dynamic secret ensures one‑time use
   - Token expires quickly for security

---

## 📁 Project Structure

```
craftify-templates-marketplace/
├── frontend/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Authentication routes
│   │   │   ├── templates/      # Template listing & details
│   │   │   ├── creators/       # Creator profiles
│   │   │   ├── orders/         # Order management
│   │   │   └── api/            # API route handlers
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Base UI primitives
│   │   │   ├── cards/         # Template/creator cards
│   │   │   └── navigation/    # Navigation components
│   │   ├── lib/               # Utilities and configurations
│   │   │   ├── api.ts         # Axios client configuration
│   │   │   ├── authQuery.ts   # Auth-related queries
│   │   │   └── templatesQuery.ts # Template data queries
│   │   ├── types/             # TypeScript type definitions
│   │   └── hooks/             # Custom React hooks
│   ├── public/                 # Static assets
│   └── package.json
├── backend/                    # Express.js backend API
│   ├── controllers/            # Request handlers
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route definitions
│   ├── middlewares/            # Custom middleware
│   ├── config/                 # Database and app configuration
│   ├── utils/                  # Helper functions
│   └── package.json
├── README.md                   # This file
└── .env.example               # Environment variables template
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB database (local or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/craftify-templates-marketplace.git
   cd craftify-templates-marketplace
   ```

2. **Install dependencies**

   ```bash
   # Frontend dependencies
   cd frontend
   npm install

   # Backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Configure your environment variables
   # See Environment Variables section below
   ```

4. **Database Setup**
   - Ensure MongoDB is running locally or configure MongoDB Atlas
   - Update `MONGO_URL` in your `.env` file

5. **Start Development Servers**

   ```bash
   # Start backend (port 3000)
   cd backend
   npm run dev

   # Start frontend (port 3001)
   cd ../frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000/api

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGO_URL=mongodb://localhost:27017/craftify_templates
DB_NAME=craftify_templates

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# Email Configuration (Gmail or SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FROM_EMAIL=noreply@craftify.com
FROM_NAME=Craftify Templates

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3001

# Optional: Custom SMTP
# SMTP_HOST=your-smtp-server.com
# SMTP_PORT=587
# SMTP_USER=your-smtp-username
# SMTP_PASS=your-smtp-password
```

---

## 📱 Mobile Responsiveness

The application features a **professional mobile navigation pattern**:

- **Primary Navigation**: 4 essential tabs (Templates, Creators, Cart, Orders)
- **More Menu**: Consolidates secondary actions (About, Login/Profile/Logout)
- **Touch‑Friendly**: Optimized button sizes and spacing
- **Responsive Design**: Adapts seamlessly from mobile to desktop

---

## 🛡 Security Features

- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: bcryptjs for secure password storage
- **Role-Based Access Control**: Granular permissions system
- **Input Validation**: Joi schemas for API input validation
- **CORS Configuration**: Proper cross-origin request handling
- **Secure Password Reset**: One-time use tokens with dynamic secrets

---

## 📊 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Templates

- `GET /api/templates` - List templates with filtering
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create template (admin/creator)

### Creators

- `GET /api/creators` - List creators
- `GET /api/creators/:id` - Get creator details

### Orders

- `GET /api/orders/my` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

---

## 🎨 UI Components

The application uses a **consistent design system**:

- **Color Scheme**: Professional gradient-based design
- **Typography**: Optimized font hierarchy with Geist font
- **Animations**: Smooth transitions with Framer Motion
- **Glassmorphism**: Modern frosted glass effects
- **Responsive Grid**: Adaptive layouts for all screen sizes

---

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Heroku)

1. Connect your repository to Railway/Heroku
2. Configure environment variables
3. Set MongoDB connection string
4. Deploy and configure custom domain

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 🙋‍♂️ Support

If you have any questions or need support, please:

1. Check the [Issues](https://github.com/your-username/craftify-templates-marketplace/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

## 🌟 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by leading template marketplaces and design systems
- Special thanks to the open-source community for the amazing tools and libraries

---

**Built with ❤️ for the creator community**
