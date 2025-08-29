# SSL Certificates

Place your SSL certificates in this directory for HTTPS support.

## Required Files

- `cert.pem` - SSL certificate
- `key.pem` - Private key

## Generating Self-Signed Certificates (Development Only)

For development/testing purposes, you can generate self-signed certificates:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

## Production Certificates

For production, use certificates from a trusted Certificate Authority:

1. **Let's Encrypt (Free):**
   ```bash
   certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./key.pem
   ```

2. **Commercial CA:**
   - Purchase certificate from your CA
   - Download certificate and private key
   - Place files as `cert.pem` and `key.pem`

## File Permissions

Ensure proper permissions:
```bash
chmod 600 key.pem
chmod 644 cert.pem
```

## Nginx Configuration

Update `docker/nginx/nginx.conf` to enable SSL by uncommenting the SSL configuration sections.