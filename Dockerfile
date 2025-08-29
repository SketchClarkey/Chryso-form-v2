# Multi-stage Dockerfile for Chryso Forms application
# Stage 1: Build client
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/client/package*.json ./apps/client/

# Install dependencies
RUN npm ci --workspaces

# Copy client source
COPY apps/client ./apps/client
COPY tsconfig.json ./

# Build client
RUN npm run build:client

# Stage 2: Build server
FROM node:20-alpine AS server-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Install dependencies
RUN npm ci --workspaces

# Copy server source
COPY apps/server ./apps/server
COPY tsconfig.json ./

# Build server
RUN npm run build:server

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

# Copy package files
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Install production dependencies only
RUN npm ci --only=production --workspaces && npm cache clean --force

# Copy built applications
COPY --from=server-builder --chown=appuser:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=client-builder --chown=appuser:nodejs /app/apps/client/dist ./apps/client/dist

# Copy static assets and configuration
COPY --chown=appuser:nodejs apps/server/src/swagger ./apps/server/swagger
COPY --chown=appuser:nodejs apps/server/uploads ./apps/server/uploads

# Create uploads directory with correct permissions
RUN mkdir -p apps/server/uploads && chown -R appuser:nodejs apps/server/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/server/dist/index.js"]