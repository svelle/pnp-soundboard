# Nginx Configuration

This directory contains nginx configuration templates for the D&D Soundboard.

## Templates

### `soundboard-init.conf.template`
- Used for initial setup before SSL certificates are obtained
- HTTP-only configuration
- Allows Let's Encrypt to verify domain ownership
- Proxies all traffic to the soundboard app

### `soundboard.conf.template`
- Full production configuration with SSL
- HTTP redirects to HTTPS
- HTTPS with Let's Encrypt certificates
- Security headers enabled
- Used after SSL certificates are obtained

## Usage

These templates use environment variable substitution with `envsubst`:

```bash
# Generate config from template
envsubst '${DOMAIN}' < soundboard.conf.template > soundboard.conf
```

The `setup-ssl.sh` script automatically handles this for you.

## Configuration Variables

- `${DOMAIN}` - Your domain name (e.g., soundboard.example.com)

Set these in your `.env` file.

## Generated Files

The `.conf` files generated from these templates are **not** committed to git.
Only the `.template` files are tracked.
