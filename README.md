# Chryso Form v2 🏗️

[![Build Status](https://github.com/SketchClarkey/Chryso-form-v2/workflows/CI/badge.svg)](https://github.com/SketchClarkey/Chryso-form-v2/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)

Modern form digitization application built with cutting-edge technologies for
enterprise-grade form management, digital workflows, and compliance tracking.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- MongoDB (local or remote)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/SketchClarkey/Chryso-form.git
   cd Chryso-form-v2
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   ```bash
   # Server environment
   cd apps/server
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start development servers**
   ```bash
   # From root directory - starts both client and server
   npm run dev
   ```

The client will be available at http://localhost:3000 and the server at
http://localhost:5000.

## 📁 Project Structure

```
chryso-form-v2/
├── apps/
│   ├── client/          # React TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── pages/
│   │   │   └── services/
│   │   └── ...
│   └── server/          # Express TypeScript backend
│       ├── src/
│       │   ├── config/
│       │   ├── middleware/
│       │   ├── models/
│       │   ├── routes/
│       │   └── utils/
│       └── ...
└── package.json         # Root workspace configuration
```

## 🛠 Development Scripts

### Root Scripts

```bash
npm run dev           # Start both client and server in development mode
npm run build         # Build both applications for production
npm run start         # Start production server
npm run test          # Run tests for both applications
npm run lint          # Lint both applications
npm run clean         # Clean build artifacts
```

### Server Scripts

```bash
npm run dev:server    # Start server in development mode
npm run build:server  # Build server for production
npm run start         # Start production server
```

### Client Scripts

```bash
npm run dev:client    # Start client in development mode
npm run build:client  # Build client for production
npm run start:client  # Preview built client
```

## 🔧 Environment Configuration

### Server Environment Variables

Create `apps/server/.env` from `.env.example`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chryso-forms-v2

# JWT secrets - use strong secrets in production!
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-at-least-32-characters-long
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

## 🏗 Architecture

### Frontend (Client)

- **React 19** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Query** for server state management
- **React Router** for navigation
- **Vite** for fast development and building

### Backend (Server)

- **Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT** authentication with refresh tokens
- **Zod** for validation
- **bcryptjs** for password hashing
- **Rate limiting** and security middleware

### Key Features

- 🔐 **Role-based authentication** (Admin, Manager, Technician)
- 📱 **Responsive design** with Material-UI
- 🔄 **Automatic token refresh**
- ⚡ **Fast development** with hot reload
- 🔒 **Security** with helmet, CORS, and rate limiting
- 📊 **MongoDB** with robust data models
- ✅ **Type safety** throughout the stack

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client
```

## 🚀 Production Deployment

1. **Build the applications**

   ```bash
   npm run build
   ```

2. **Set production environment variables**
   - Update `apps/server/.env` with production values
   - Use strong JWT secrets
   - Configure production MongoDB URI
   - Set NODE_ENV=production

3. **Start the production server**
   ```bash
   npm run start
   ```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

Built with ❤️ by the Chryso Forms team
