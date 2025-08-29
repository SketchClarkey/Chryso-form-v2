#!/bin/bash

# Database backup script for Chryso Forms
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Docker Compose backup
backup_docker_compose() {
    log_info "Creating Docker Compose database backup..."
    
    BACKUP_FILE="$BACKUP_DIR/chryso-forms-backup-${TIMESTAMP}.gz"
    
    if docker-compose ps | grep -q "mongodb.*Up"; then
        docker-compose exec -T mongodb mongodump \
            --authenticationDatabase admin \
            --archive --gzip > "$BACKUP_FILE"
        
        log_success "Backup created: $BACKUP_FILE"
        echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        log_error "MongoDB container is not running"
        exit 1
    fi
}

# Kubernetes backup
backup_kubernetes() {
    log_info "Creating Kubernetes database backup..."
    
    BACKUP_FILE="$BACKUP_DIR/chryso-forms-k8s-backup-${TIMESTAMP}.gz"
    
    # Get MongoDB pod name
    MONGO_POD=$(kubectl get pods -n chryso-forms -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$MONGO_POD" ]; then
        log_error "MongoDB pod not found in chryso-forms namespace"
        exit 1
    fi
    
    # Create backup
    kubectl exec -n chryso-forms "$MONGO_POD" -- mongodump \
        --authenticationDatabase admin \
        --archive --gzip > "$BACKUP_FILE"
    
    log_success "Backup created: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

# Application files backup
backup_uploads() {
    log_info "Creating uploads backup..."
    
    UPLOADS_BACKUP="$BACKUP_DIR/uploads-backup-${TIMESTAMP}.tar.gz"
    
    if [ -d "./apps/server/uploads" ]; then
        tar -czf "$UPLOADS_BACKUP" -C "./apps/server" uploads
        log_success "Uploads backup created: $UPLOADS_BACKUP"
        echo "Size: $(du -h "$UPLOADS_BACKUP" | cut -f1)"
    elif docker-compose ps | grep -q "app.*Up"; then
        # Backup from running container
        docker-compose exec -T app tar -czf - /app/apps/server/uploads > "$UPLOADS_BACKUP"
        log_success "Uploads backup created from container: $UPLOADS_BACKUP"
        echo "Size: $(du -h "$UPLOADS_BACKUP" | cut -f1)"
    else
        log_warning "No uploads directory found to backup"
    fi
}

# Configuration backup
backup_config() {
    log_info "Creating configuration backup..."
    
    CONFIG_BACKUP="$BACKUP_DIR/config-backup-${TIMESTAMP}.tar.gz"
    
    tar -czf "$CONFIG_BACKUP" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=build \
        --exclude=logs \
        --exclude=backups \
        .env* docker-compose*.yml Dockerfile* k8s-*.yaml || true
    
    log_success "Configuration backup created: $CONFIG_BACKUP"
    echo "Size: $(du -h "$CONFIG_BACKUP" | cut -f1)"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log_success "Old backups cleaned up"
}

# Restore database (Docker Compose)
restore_docker_compose() {
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_warning "This will OVERWRITE the existing database. Continue? (y/N)"
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        log_info "Restoring database from: $BACKUP_FILE"
        
        docker-compose exec -T mongodb mongorestore \
            --authenticationDatabase admin \
            --archive --gzip --drop < "$BACKUP_FILE"
        
        log_success "Database restored successfully"
    else
        log_info "Restore cancelled"
    fi
}

# Restore database (Kubernetes)
restore_kubernetes() {
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    # Get MongoDB pod name
    MONGO_POD=$(kubectl get pods -n chryso-forms -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$MONGO_POD" ]; then
        log_error "MongoDB pod not found in chryso-forms namespace"
        exit 1
    fi
    
    log_warning "This will OVERWRITE the existing database. Continue? (y/N)"
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        log_info "Restoring database from: $BACKUP_FILE"
        
        kubectl exec -i -n chryso-forms "$MONGO_POD" -- mongorestore \
            --authenticationDatabase admin \
            --archive --gzip --drop < "$BACKUP_FILE"
        
        log_success "Database restored successfully"
    else
        log_info "Restore cancelled"
    fi
}

# List backups
list_backups() {
    log_info "Available backups in $BACKUP_DIR:"
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.gz" -o -name "*.tar.gz" | sort -r | head -20 | while read -r file; do
            echo "  $(basename "$file") - $(date -r "$file" '+%Y-%m-%d %H:%M:%S') - $(du -h "$file" | cut -f1)"
        done
    else
        log_warning "No backup directory found"
    fi
}

# Usage information
usage() {
    echo "Chryso Forms Backup Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup-db           Create database backup"
    echo "  backup-docker       Create database backup (Docker Compose)"
    echo "  backup-k8s          Create database backup (Kubernetes)"
    echo "  backup-uploads      Create uploads directory backup"
    echo "  backup-config       Create configuration files backup"
    echo "  backup-all          Create complete backup (database + uploads + config)"
    echo "  restore-docker      Restore database (Docker Compose)"
    echo "  restore-k8s         Restore database (Kubernetes)"
    echo "  list                List available backups"
    echo "  cleanup             Remove old backups"
    echo "  help                Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_DIR          Backup directory (default: ./backups)"
    echo "  RETENTION_DAYS      Days to keep backups (default: 30)"
}

# Main script logic
create_backup_dir

case "${1:-help}" in
    "backup-db"|"backup-docker")
        backup_docker_compose
        cleanup_old_backups
        ;;
    "backup-k8s")
        backup_kubernetes
        cleanup_old_backups
        ;;
    "backup-uploads")
        backup_uploads
        cleanup_old_backups
        ;;
    "backup-config")
        backup_config
        cleanup_old_backups
        ;;
    "backup-all")
        backup_docker_compose
        backup_uploads
        backup_config
        cleanup_old_backups
        ;;
    "restore-docker")
        restore_docker_compose "$2"
        ;;
    "restore-k8s")
        restore_kubernetes "$2"
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "help"|*)
        usage
        ;;
esac