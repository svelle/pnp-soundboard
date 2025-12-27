# SSL Certificates

Place your SSL certificate files in this directory.

## Required Files

- **fullchain.pem** - Your full certificate chain (certificate + intermediate certificates)
- **privkey.pem** - Your private key

## How to Copy Certificates

### If using Let's Encrypt

```bash
# Remove any existing symlinks
rm -f fullchain.pem privkey.pem

# Copy the actual certificate files (replace domain with yours)
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem privkey.pem

# Fix ownership (run from the nginx/ssl directory)
sudo chown $USER:$USER fullchain.pem privkey.pem

# Set proper permissions
chmod 644 fullchain.pem
chmod 600 privkey.pem
```

### If using other certificate providers

```bash
# Copy your certificate files to this directory
cp /path/to/your/fullchain.pem fullchain.pem
cp /path/to/your/privkey.pem privkey.pem

# Set proper permissions
chmod 644 fullchain.pem
chmod 600 privkey.pem
```

**Important:** Don't use symlinks! Docker containers can't follow symlinks that point outside mounted volumes. Always copy the actual files.

## File Permissions

- `fullchain.pem` - Should be readable (644)
- `privkey.pem` - Should be private (600)

## Certificate Renewal

When your certificate provider renews your wildcard certificate:

1. Copy the new certificate files to this directory
2. Restart nginx: `docker-compose restart nginx`

That's it!
