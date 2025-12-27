# SSL Setup with External Certificate

This guide is for using your own SSL certificate (e.g., wildcard certificate managed elsewhere).

## Prerequisites

- Your SSL certificate files (fullchain.pem and privkey.pem)
- Domain configured in `.env` file

## Quick Setup

### 1. Configure Domain

Edit `.env`:
```bash
DOMAIN=pnp-soundboard.svelle.dev
SOUNDBOARD_PASSWORD=your-secure-password
```

### 2. Copy SSL Certificates

Place your certificate files in `nginx/ssl/`:

```bash
# Copy your certificate files
cp /path/to/fullchain.pem nginx/ssl/fullchain.pem
cp /path/to/privkey.pem nginx/ssl/privkey.pem

# Set proper permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### 3. Deploy

```bash
# Using the deploy script
./deploy.sh

# OR using make
make deploy
```

That's it! Your soundboard will be available at `https://your-domain.com`

## Certificate Files

The nginx configuration expects these files in `nginx/ssl/`:

- **fullchain.pem** - Your full certificate chain
- **privkey.pem** - Your private key

## Updating Certificates

When your certificate is renewed:

```bash
# Copy new certificates
cp /path/to/new/fullchain.pem nginx/ssl/fullchain.pem
cp /path/to/new/privkey.pem nginx/ssl/privkey.pem

# Restart nginx
docker-compose restart nginx
```

## Nginx Configuration

The nginx config is generated from `nginx/conf.d/soundboard.conf.template`:

- Redirects HTTP (port 80) to HTTPS (port 443)
- Uses certificates from `/etc/nginx/ssl/` (mapped to `./nginx/ssl/`)
- Proxies all traffic to the soundboard app on port 3000

## Troubleshooting

**Nginx won't start:**
```bash
# Check nginx logs
docker-compose logs nginx

# Common issues:
# - Certificate files not found
# - Incorrect file permissions
# - Invalid certificate format
```

**Certificate not found:**
```bash
# Verify files exist
ls -la nginx/ssl/

# Should show:
# - fullchain.pem
# - privkey.pem
```

**Permission errors:**
```bash
# Fix permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```
