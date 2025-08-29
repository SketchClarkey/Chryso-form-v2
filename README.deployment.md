# Chryso Forms - Deployment Guide

This guide covers deployment options for the Chryso Forms application using
Docker and Docker Compose.

## Quick Start

### Prerequisites

- Docker 20.10 or later
- Docker Compose 2.0 or later
- At least 2GB RAM available for containers

### Production Deployment

1. **Clone and setup environment**:

   ```bash
   git clone <repository-url>
   cd chryso-forms-v2
   cp .env.example .env
   ```

2. **Configure environment variables**: Edit the `.env` file with your
   production settings:

   ```bash
   # Required changes for production
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
   JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters
   MONGO_ROOT_PASSWORD=your-secure-mongo-password
   ```

3. **Deploy**:
   ```bash
   ./deploy.sh deploy
   ```

The application will be available at `http://localhost:5000`

### Development Environment

For development with hot reload:

```bash
./deploy.sh dev
```

This starts:

- Client at `http://localhost:3000` (React with hot reload)
- Server at `http://localhost:5000` (Express with hot reload)
- MongoDB at `localhost:27017`

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Production:**

```bash
docker-compose up -d
```

**Development:**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Option 2: Deploy Script

The `deploy.sh` script provides automated deployment with additional features:

```bash
# Production deployment
./deploy.sh deploy

# Development environment
./deploy.sh dev

# View logs
./deploy.sh logs

# Health check
./deploy.sh health

# Database backup
./deploy.sh backup

# Stop services
./deploy.sh stop

# Cleanup
./deploy.sh cleanup
```

### Option 3: Manual Docker Build

```bash
# Build image
docker build -t chryso-forms:latest .

# Run with external MongoDB
docker run -d \
  --name chryso-forms \
  -p 5000:5000 \
  -e MONGODB_URI="mongodb://your-mongo-host:27017/chryso-forms" \
  -e JWT_SECRET="your-jwt-secret" \
  chryso-forms:latest
```

## Configuration

### Environment Variables

| Variable             | Description               | Default                 | Required |
| -------------------- | ------------------------- | ----------------------- | -------- |
| `NODE_ENV`           | Environment mode          | `production`            | No       |
| `PORT`               | Application port          | `5000`                  | No       |
| `MONGODB_URI`        | MongoDB connection string | -                       | Yes      |
| `JWT_SECRET`         | JWT signing secret        | -                       | Yes      |
| `JWT_REFRESH_SECRET` | JWT refresh token secret  | -                       | Yes      |
| `CLIENT_URL`         | Frontend URL for CORS     | `http://localhost:3000` | No       |
| `MAX_FILE_SIZE`      | Max upload size in bytes  | `10485760` (10MB)       | No       |

### Database Configuration

The application uses MongoDB with authentication. The compose files set up:

- MongoDB with root authentication
- Persistent data volumes
- Network isolation

### SSL/HTTPS Configuration

To enable HTTPS with Nginx:

1. **Uncomment SSL sections** in `docker/nginx/nginx.conf`
2. **Add SSL certificates** to `docker/nginx/ssl/`
3. **Enable nginx profile**:
   ```bash
   docker-compose --profile nginx up -d
   ```

## Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

- **HTTP endpoint**: `GET /api/health`
- **Docker health check**: Automatic container health monitoring
- **Deploy script**: `./deploy.sh health`

### Logging

View application logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Using deploy script
./deploy.sh logs [service-name]
```

### Database Backup and Restore

**Backup:**

```bash
./deploy.sh backup
```

**Restore:**

```bash
./deploy.sh restore backup-20240101_120000.gz
```

**Manual backup:**

```bash
docker-compose exec mongodb mongodump --authenticationDatabase admin --archive --gzip > backup.gz
```

### Updates and Maintenance

**Update application:**

```bash
# Pull latest code
git pull

# Rebuild and deploy
./deploy.sh deploy
```

**Database maintenance:**

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p

# View database stats
db.stats()

# Create indexes (if needed)
db.forms.createIndex({ "worksite": 1, "status": 1 })
```

## Performance Optimization

### Production Optimizations

The production Dockerfile includes:

- Multi-stage builds for smaller images
- Non-root user for security
- Optimized Node.js settings
- Static asset optimization

### Scaling

For horizontal scaling:

1. **Use external MongoDB cluster**
2. **Add Redis for session storage**:
   ```bash
   docker-compose --profile redis up -d
   ```
3. **Load balancer configuration** (Nginx included)
4. **Environment-specific compose files**

### Resource Requirements

**Minimum:**

- 1 CPU core
- 2GB RAM
- 10GB storage

**Recommended:**

- 2 CPU cores
- 4GB RAM
- 50GB storage (with logs and backups)

## Security Considerations

### Container Security

- Runs as non-root user
- Read-only root filesystem where possible
- Security headers in Nginx
- Network isolation between services

### Application Security

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation with Zod
- CORS configuration

### Database Security

- MongoDB authentication required
- Admin user with strong password
- Network isolation
- Regular backups encrypted at rest

## Troubleshooting

### Common Issues

**Container won't start:**

```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env | grep -E "(MONGO|JWT)"
```

**Database connection failed:**

```bash
# Test MongoDB connectivity
docker-compose exec app npm run db:test

# Check MongoDB logs
docker-compose logs mongodb
```

**Permission errors:**

```bash
# Fix upload directory permissions
docker-compose exec app chown -R appuser:nodejs /app/apps/server/uploads
```

**Memory issues:**

```bash
# Check resource usage
docker stats

# Increase Docker memory allocation if needed
```

### Debug Mode

Enable debug logging:

```bash
# Add to .env file
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

## Support

For issues and support:

1. Check logs: `./deploy.sh logs`
2. Run health check: `./deploy.sh health`
3. Review environment configuration
4. Check Docker and system resources

## Migration from Development

When migrating from development to production:

1. **Backup development data**
2. **Update environment variables**
3. **Run production deployment**
4. **Restore data if needed**
5. **Verify all functionality**

The application maintains data compatibility between environments.
