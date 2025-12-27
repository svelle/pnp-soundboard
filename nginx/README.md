# Nginx Configuration

This directory contains nginx configuration templates for the D&D Soundboard.

## Template

### `soundboard.conf.template`
- Full production configuration with SSL
- HTTP redirects to HTTPS
- HTTPS with external SSL certificates (from `nginx/ssl/`)
- Security headers enabled (HSTS, X-Frame-Options, etc.)
- Proxies all traffic to the soundboard app on port 3000
- Supports file uploads up to 50MB

## Usage

These templates use environment variable substitution with `envsubst`:

```bash
# Generate config from template
envsubst '${DOMAIN}' < soundboard.conf.template > soundboard.conf
```

The `deploy.sh` script automatically handles this for you.

Alternatively, use:
```bash
make deploy
```

## Configuration Variables

- `${DOMAIN}` - Your domain name (e.g., soundboard.example.com)

Set this in your `.env` file.

## SSL Certificates

Place your SSL certificate files in the `nginx/ssl/` directory:
- `fullchain.pem` - Your full certificate chain
- `privkey.pem` - Your private key

See [nginx/ssl/README.md](ssl/README.md) for details.

## Generated Files

The `.conf` files generated from these templates are **not** committed to git.
Only the `.template` files are tracked.
