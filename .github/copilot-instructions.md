# Chryso Forms v2 Development Instructions

**CRITICAL: Always follow these instructions first and only fallback to additional search and context gathering if the information provided here is incomplete or found to be in error.**

## Quick Start for Developers

Chryso Forms v2 is a modern monorepo with a React TypeScript frontend and Express TypeScript backend using MongoDB.

### Essential Setup Commands

- **Node.js Requirement**: Node.js 20.11.0+ (check with `node --version`)
- **Install dependencies**: `npm ci` -- takes ~45 seconds
- **Environment setup**: `cp apps/server/.env.example apps/server/.env`
- **MongoDB requirement**: Database must be running (see Database Setup below)

### Critical Build Information

**NEVER CANCEL BUILDS OR LONG-RUNNING COMMANDS**

- **Server build**: `npm run build:server` -- **ALWAYS WORKS** (~15 seconds). Set timeout to 60+ minutes.
- **Client build**: `npm run build:client` -- **CURRENTLY FAILS** due to TypeScript errors in Grid components (~5 seconds before failure)
- **Full build**: `npm run build` -- **FAILS** due to client build issues
- **Type checking**: `npm run type-check` -- **WORKS** despite build failures

### Database Setup

**CRITICAL**: All tests and server startup require MongoDB to be running.

#### Option 1: Docker (Recommended)
```bash
# Start MongoDB only (no client build issues)
docker compose -f docker-compose.dev.yml up mongodb-dev
# Runs on port 27017 with credentials admin/password
```

#### Option 2: Local MongoDB
Install MongoDB locally and ensure it's running on `localhost:27017`.

### Development Commands

#### Working Commands (Validated)
- **Development server**: `npm run dev:server` -- **WORKS** when MongoDB is available (starts in ~3 seconds)
- **Server tests**: `npm run test -w apps/server` -- **REQUIRES MONGODB** (~30 seconds)
- **Type checking**: `npm run type-check` -- **WORKS** (~5 seconds)
- **Format code**: `npm run format` -- **MOSTLY WORKS** (fails on files with syntax errors, ~6 seconds)

#### Problematic Commands (Document Known Issues)
- **Client development**: `npm run dev:client` -- **NOT TESTED** (likely works in dev mode despite build issues)
- **Client tests**: `npm run test -w apps/client` -- **FAILS** with component test errors (~9 seconds)
- **Lint**: `npm run lint` -- **FAILS** with 2600+ lint errors (~6 seconds)
- **E2E tests**: `npm run test:e2e` -- **REQUIRES** both MongoDB and built applications

### Known Issues and Workarounds

#### Critical Known Issues
1. **Client build fails** due to MUI Grid component migration issues (Grid vs Grid2)
2. **Extensive linting errors** throughout codebase (~1300 errors, 1300 warnings)
3. **All tests require MongoDB** - no mock database setup currently active
4. **Client tests fail** due to component testing setup issues

#### Workarounds Available
- **Development mode works** despite build failures
- **Server components are stable** and build successfully
- **Type checking passes** indicating TypeScript setup is correct
- **Server can run** when MongoDB is available

### Validation Requirements

**ALWAYS run these validation steps after making changes:**

1. **Server validation**: `npm run build:server && npm run type-check`
2. **Code formatting**: `npm run format` (expect some failures in broken components)
3. **MongoDB test**: Start dev server to ensure database connectivity

**Manual validation scenarios** (when MongoDB is available):
- Test server startup: `npm run dev:server` should start without errors
- Verify API health: `curl http://localhost:5000/api/health` should return JSON
- Database connection: Server logs should show "Connected to MongoDB"

### Project Structure

#### Key Directories
- **`apps/server/`**: Express.js backend (STABLE)
- **`apps/client/`**: React frontend (BUILD ISSUES)
- **`tests/e2e/`**: Playwright E2E tests
- **`docker/`**: Docker configurations
- **`.github/workflows/`**: CI/CD pipeline

#### Critical Files
- **`package.json`**: Root workspace configuration
- **`apps/server/.env`**: Server environment configuration
- **`docker-compose.dev.yml`**: Development database setup
- **`playwright.config.ts`**: E2E test configuration

### Build Timing and Timeouts

**NEVER CANCEL - ALWAYS SET APPROPRIATE TIMEOUTS:**

- **Dependencies install**: 45 seconds (set timeout: 900 seconds)
- **Server build**: 15 seconds (set timeout: 300 seconds)
- **Client build**: 5 seconds before failure (set timeout: 300 seconds)
- **Server tests**: 30 seconds with MongoDB (set timeout: 600 seconds)
- **Full test suite**: Not validated due to dependencies

### CI/CD Notes

The CI pipeline expects:
- MongoDB service available
- Node.js 20.11.0+
- Build steps to pass (currently client build fails)
- Tests to pass (currently requires database)

### Security and Environment

- **JWT secrets required** in `.env` file
- **MongoDB credentials** configured in Docker Compose
- **CORS setup** for localhost:3000 client
- **File upload** configuration in server environment

### Testing Strategy

#### Current Test State
- **Server tests**: Full test suite available but requires MongoDB
- **Client tests**: Component tests exist but currently failing
- **E2E tests**: Comprehensive Playwright setup but requires full stack
- **Integration tests**: Available for server with real database

#### Test Users (for E2E when working)
- **Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123
- **Technician**: tech@example.com / tech123

### Emergency Procedures

If builds are completely broken:
1. Focus on server-side changes only (`apps/server/`)
2. Use `npm run build:server` to validate changes
3. Test with `npm run dev:server` when MongoDB is available
4. Avoid client-side changes until Grid component issues are resolved

### Development Best Practices

1. **Always validate server builds** before committing
2. **Start with MongoDB running** for any server development
3. **Use type checking** as primary validation method
4. **Format code regularly** but expect some failures
5. **Test incrementally** with server endpoints when possible

## Summary

This codebase has a **working server** but **problematic client build**. Focus development on the server side and use development mode for client changes. The MongoDB dependency is absolute for testing and development.