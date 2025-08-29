#!/bin/bash

# Chryso Forms Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="chryso-forms"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build application
build_app() {
    log_info "Building Chryso Forms application..."
    
    # Build the Docker image
    if [ -n "$DOCKER_REGISTRY" ]; then
        IMAGE_TAG="${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
    else
        IMAGE_TAG="${PROJECT_NAME}:${VERSION}"
    fi
    
    docker build -t "$IMAGE_TAG" .
    
    log_success "Application built successfully: $IMAGE_TAG"
}

# Deploy with Docker Compose
deploy_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        log_warning "Please edit .env file with your configuration before continuing."
        read -p "Press Enter to continue after editing .env file..."
    fi
    
    # Stop existing containers
    if docker-compose ps | grep -q "$PROJECT_NAME"; then
        log_info "Stopping existing containers..."
        docker-compose down
    fi
    
    # Deploy the application
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Deployment successful!"
        log_info "Application is available at: http://localhost:${PORT:-5000}"
        log_info "To view logs: docker-compose logs -f"
        log_info "To stop: docker-compose down"
    else
        log_error "Deployment failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Development deployment
deploy_dev() {
    log_info "Starting development environment..."
    
    # Use development compose file
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up -d
    
    log_success "Development environment started!"
    log_info "Client: http://localhost:3000"
    log_info "Server: http://localhost:5000"
    log_info "Database: localhost:27017"
    log_info "To stop: docker-compose -f docker-compose.dev.yml down"
}

# Production deployment
deploy_prod() {
    log_info "Starting production deployment..."
    
    # Ensure we have the latest images
    build_app
    
    # Deploy with production settings
    export NODE_ENV=production
    deploy_compose
    
    # Run database migrations if needed
    log_info "Running database setup..."
    docker-compose exec app npm run db:migrate 2>/dev/null || log_warning "No migration script found"
    
    log_success "Production deployment completed!"
}

# Backup database
backup_db() {
    log_info "Creating database backup..."
    
    BACKUP_FILE="backup-$(date +%Y%m%d_%H%M%S).gz"
    
    docker-compose exec mongodb mongodump --authenticationDatabase admin --archive --gzip > "$BACKUP_FILE"
    
    log_success "Database backup created: $BACKUP_FILE"
}

# Restore database
restore_db() {
    if [ -z "$1" ]; then
        log_error "Please provide backup file: ./deploy.sh restore <backup-file>"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_info "Restoring database from: $BACKUP_FILE"
    log_warning "This will overwrite existing data. Continue? (y/N)"
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker-compose exec -T mongodb mongorestore --authenticationDatabase admin --archive --gzip --drop < "$BACKUP_FILE"
        log_success "Database restored successfully"
    else
        log_info "Restore cancelled"
    fi
}

# Show logs
show_logs() {
    SERVICE="${1:-}"
    if [ -n "$SERVICE" ]; then
        docker-compose logs -f "$SERVICE"
    else
        docker-compose logs -f
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Services are not running"
        return 1
    fi
    
    # Check application health endpoint
    if curl -f http://localhost:${PORT:-5000}/api/health &> /dev/null; then
        log_success "Application is healthy"
        return 0
    else
        log_error "Application health check failed"
        return 1
    fi
}

# Clean up
cleanup() {
    log_info "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove dangling volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

# Usage information
usage() {
    echo "Chryso Forms Deployment Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build               Build the application image"
    echo "  deploy              Deploy to production"
    echo "  dev                 Start development environment"
    echo "  backup              Create database backup"
    echo "  restore <file>      Restore database from backup"
    echo "  logs [service]      Show logs (optional service name)"
    echo "  health              Check application health"
    echo "  stop                Stop all services"
    echo "  cleanup             Clean up Docker resources"
    echo "  help                Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  VERSION             Docker image version (default: latest)"
    echo "  ENVIRONMENT         Deployment environment (default: production)"
    echo "  DOCKER_REGISTRY     Docker registry URL (optional)"
    echo "  PORT                Application port (default: 5000)"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_prerequisites
        build_app
        ;;
    "deploy")
        check_prerequisites
        deploy_prod
        ;;
    "dev")
        check_prerequisites
        deploy_dev
        ;;
    "backup")
        backup_db
        ;;
    "restore")
        restore_db "$2"
        ;;
    "logs")
        show_logs "$2"
        ;;
    "health")
        health_check
        ;;
    "stop")
        docker-compose down
        log_success "Services stopped"
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        usage
        ;;
esac