# SSL Certificates

Place your SSL certificate files in this directory.

## Required Files

- **fullchain.pem** - Your full certificate chain (certificate + intermediate certificates)
- **privkey.pem** - Your private key

## For Wildcard Certificates

If you're using a wildcard certificate (e.g., `*.svelle.dev`), just copy your certificate files here:

```bash
# Copy your certificate files to this directory
cp /path/to/your/fullchain.pem nginx/ssl/fullchain.pem
cp /path/to/your/privkey.pem nginx/ssl/privkey.pem

# Set proper permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

## File Permissions

- `fullchain.pem` - Should be readable (644)
- `privkey.pem` - Should be private (600)

## Certificate Renewal

When your certificate provider renews your wildcard certificate:

1. Copy the new certificate files to this directory
2. Restart nginx: `docker-compose restart nginx`

That's it!
