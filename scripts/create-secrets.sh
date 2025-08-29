#!/bin/bash

# Script to create Kubernetes secrets for Chryso Forms deployment
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating Kubernetes secrets for Chryso Forms...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl is not installed. Please install kubectl first.${NC}"
    exit 1
fi

# Function to base64 encode
b64encode() {
    echo -n "$1" | base64 -w 0
}

# Function to generate random secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Prompt for values or use defaults
read -p "MongoDB root password (or press Enter to generate): " MONGO_PASSWORD
if [ -z "$MONGO_PASSWORD" ]; then
    MONGO_PASSWORD=$(generate_secret 16)
    echo -e "${YELLOW}Generated MongoDB password: $MONGO_PASSWORD${NC}"
fi

read -p "JWT secret (or press Enter to generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_secret 32)
    echo -e "${YELLOW}Generated JWT secret: $JWT_SECRET${NC}"
fi

read -p "JWT refresh secret (or press Enter to generate): " JWT_REFRESH_SECRET
if [ -z "$JWT_REFRESH_SECRET" ]; then
    JWT_REFRESH_SECRET=$(generate_secret 32)
    echo -e "${YELLOW}Generated JWT refresh secret: $JWT_REFRESH_SECRET${NC}"
fi

read -p "Database name [chryso-forms-v2]: " DB_NAME
DB_NAME=${DB_NAME:-chryso-forms-v2}

# Construct MongoDB URI
MONGODB_URI="mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/${DB_NAME}?authSource=admin"

echo -e "${GREEN}Creating namespace...${NC}"
kubectl create namespace chryso-forms --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}Creating MongoDB secret...${NC}"
kubectl create secret generic mongodb-secret \
    --from-literal=password="$MONGO_PASSWORD" \
    --namespace=chryso-forms \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}Creating application secret...${NC}"
kubectl create secret generic app-secret \
    --from-literal=mongodb-uri="$MONGODB_URI" \
    --from-literal=jwt-secret="$JWT_SECRET" \
    --from-literal=jwt-refresh-secret="$JWT_REFRESH_SECRET" \
    --namespace=chryso-forms \
    --dry-run=client -o yaml | kubectl apply -f -

# Create a backup file with the secrets
BACKUP_FILE="secrets-backup-$(date +%Y%m%d_%H%M%S).txt"
cat > "$BACKUP_FILE" << EOF
# Chryso Forms Secrets Backup
# Generated on $(date)

MongoDB Password: $MONGO_PASSWORD
JWT Secret: $JWT_SECRET
JWT Refresh Secret: $JWT_REFRESH_SECRET
Database Name: $DB_NAME
MongoDB URI: $MONGODB_URI

# Base64 encoded values for manual secret creation:
MongoDB Password (base64): $(b64encode "$MONGO_PASSWORD")
MongoDB URI (base64): $(b64encode "$MONGODB_URI")
JWT Secret (base64): $(b64encode "$JWT_SECRET")
JWT Refresh Secret (base64): $(b64encode "$JWT_REFRESH_SECRET")
EOF

echo -e "${GREEN}Secrets created successfully!${NC}"
echo -e "${YELLOW}Backup saved to: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Please store this backup file securely and delete it after confirming deployment.${NC}"

echo -e "${GREEN}You can now deploy the application with:${NC}"
echo -e "${YELLOW}kubectl apply -f k8s-deployment.yaml${NC}"

# Verify secrets
echo -e "${GREEN}Verifying secrets...${NC}"
kubectl get secrets -n chryso-forms

echo -e "${GREEN}Setup complete!${NC}"