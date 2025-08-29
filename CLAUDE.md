# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Commands

### Essential Commands

- `npm run dev` - Start both client (port 3000) and server (port 5000) in
  development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both client and server
- `npm run lint` - Lint both applications (uses ESLint)

### Individual App Commands

- `npm run dev:client` - Start only the React client
- `npm run dev:server` - Start only the Express server
- `npm run build:client` - Build client only
- `npm run build:server` - Build server only

### Testing Commands

- Client tests: `npm run test -w apps/client` (uses Vitest)
- Server tests: `npm run test -w apps/server` (uses Vitest)

## Project Architecture

### Monorepo Structure

This is a workspace-based monorepo with two main applications:

- `apps/client/` - React 19 + TypeScript frontend with Vite
- `apps/server/` - Express + TypeScript backend with MongoDB

### Frontend Architecture (apps/client/)

- **Build Tool**: Vite with hot reload
- **UI Framework**: Material-UI (MUI) v7 with React 19
- **State Management**: React Query (@tanstack/react-query) for server state,
  React Context for auth
- **Routing**: React Router v7
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics
- **Drag & Drop**: @dnd-kit for dashboard and form builders

### Backend Architecture (apps/server/)

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh tokens, bcryptjs for password hashing
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Zod schemas
- **File Uploads**: Multer middleware

### Key Application Structure

The client follows a feature-based organization:

- `components/` - Organized by feature (auth, forms, dashboards, analytics,
  reports, etc.)
- `pages/` - Route components
- `services/` - API client and service layers
- `contexts/` - React contexts (AuthContext for authentication)
- `hooks/` - Custom React hooks (useDebounce, useAsyncOperation)

The server uses standard Express patterns:

- `routes/` - API endpoints organized by resource
- `models/` - Mongoose schemas (User, Form, Template, Dashboard, Report,
  Worksite)
- `middleware/` - Auth, security, error handling, file upload
- `services/` - Business logic (analytics, dashboard, export, scheduler, search)

### Authentication System

- JWT-based with access and refresh tokens
- Role-based access control (Admin, Manager, Technician)
- Token stored in localStorage on client
- Automatic token refresh handled by AuthContext
- Server-side token validation middleware

### Environment Setup

Server requires `.env` file in `apps/server/`:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chryso-forms-v2
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
CLIENT_URL=http://localhost:3000
```

### Database Models

Core entities: User, Form, Template, Dashboard, Report, Worksite

- Forms support status workflows and approval processes
- Templates have versioning system
- Dashboards are customizable with widgets
- Reports support scheduling and various export formats

### Development Notes

- Both apps use TypeScript with strict type checking
- ESLint configuration for code quality
- Vitest for testing framework
- Development mode runs both apps concurrently
- Client proxies API requests to server during development
