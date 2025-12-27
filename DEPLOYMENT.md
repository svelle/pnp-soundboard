# 🚀 Deployment Guide for D&D Soundboard

This guide covers deploying the soundboard to a VPS for D&D sessions.

## Why Server Mode?

**Benefits:**
- Pre-load all sounds before the session
- Players just open a URL - no uploads needed
- Sounds persist across sessions
- Better performance for multiple players
- Centralized sound management

## Prerequisites

- VPS with Docker installed (DigitalOcean, Linode, AWS, etc.)
- Domain name (optional, but recommended)
- SSH access to your VPS

## Quick Start

### 1. Prepare Your VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/yourusername/dnd-soundboard.git
cd dnd-soundboard

# Create environment file
cp .env.example .env

# Set a secure password
nano .env
```

Edit `.env`:
```env
PORT=3000
SOUNDBOARD_PASSWORD=YourSecurePasswordHere123!
```

### 3. Deploy

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access

Open `http://your-vps-ip:3000` in your browser.

## Domain Setup with SSL (Recommended)

The soundboard includes **built-in nginx and automatic Let's Encrypt SSL** support via Docker Compose. No manual nginx installation needed!

### Prerequisites

1. A domain name pointed to your VPS IP address
2. Ports 80 and 443 open in your firewall
3. Docker and Docker Compose installed

### Automated SSL Setup

**1. Configure your domain**

Edit your `.env` file:
```bash
nano .env
```

Add your domain and email:
```env
PORT=3000
SOUNDBOARD_PASSWORD=YourSecurePasswordHere123!
DOMAIN=soundboard.yourdomain.com
EMAIL=your-email@example.com
```

**2. Run the SSL setup script**

```bash
chmod +x setup-ssl.sh
./setup-ssl.sh
```

The script will:
- Configure nginx as a reverse proxy
- Obtain a free SSL certificate from Let's Encrypt
- Set up automatic certificate renewal (every 12 hours)
- Configure HTTPS with security headers

**3. Access your soundboard**

Your soundboard is now available at:
- `https://soundboard.yourdomain.com` (HTTPS - secure)
- `http://soundboard.yourdomain.com` (HTTP - redirects to HTTPS)

### Manual SSL Setup (Alternative)

If you prefer manual control or the script doesn't work:

**1. Start with HTTP-only configuration**
```bash
# Generate initial config
envsubst '${DOMAIN}' < nginx/conf.d/soundboard-init.conf.template > nginx/conf.d/soundboard.conf

# Start services
docker-compose up -d soundboard nginx
```

**2. Obtain SSL certificate**
```bash
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d soundboard.yourdomain.com
```

**3. Switch to HTTPS configuration**
```bash
# Update config to use SSL
envsubst '${DOMAIN}' < nginx/conf.d/soundboard.conf.template > nginx/conf.d/soundboard.conf

# Restart nginx
docker-compose restart nginx

# Start certbot for auto-renewal
docker-compose up -d certbot
```

### SSL Certificate Renewal

Certificates are automatically renewed every 12 hours by the certbot container. No manual intervention needed!

To manually renew:
```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

## Preparing for a Session

### 1. Upload Sounds (Before Session)

1. Access your soundboard URL
2. Click "Upload" button
3. Enter your password
4. Upload all sounds you'll need:
   - Sound effects (sword clashes, explosions, etc.)
   - Background music (tavern, battle, exploration)
   - Ambience (rain, forest, ocean, etc.)

### 2. Test Pre-loading

1. Clear browser cache
2. Reload the page
3. Watch sounds pre-load with progress indicators
4. Verify all sounds show "Ready"

### 3. Share with Players

Give players the URL: `https://soundboard.yourdomain.com`

They'll see:
- Automatic sound pre-loading
- All sounds ready to play
- No uploads needed

## Management Commands

### View Logs
```bash
docker-compose logs -f
```

### Restart Server
```bash
docker-compose restart
```

### Stop Server
```bash
docker-compose down
```

### Update Soundboard
```bash
git pull
docker-compose up -d --build
```

### Backup Sounds
```bash
# Create backup
tar -czf soundboard-backup-$(date +%Y%m%d).tar.gz sounds/

# Restore from backup
tar -xzf soundboard-backup-YYYYMMDD.tar.gz
```

### Clear All Sounds
```bash
rm -rf sounds/*
# Recreate metadata file
docker-compose restart
```

## Security Best Practices

1. **Strong Password**: Use a long, random password
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

2. **Firewall**: Only expose port 80/443
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

3. **SSL/TLS**: Always use HTTPS in production
4. **Regular Updates**: Keep Docker and system updated
5. **Backups**: Regularly backup the `sounds/` directory

## Performance Optimization

### For Many Players (10+)

1. **Increase Docker Resources**
   Edit `docker-compose.yml`:
   ```yaml
   services:
     soundboard:
       deploy:
         resources:
           limits:
             memory: 1G
           reservations:
             memory: 512M
   ```

2. **Enable Nginx Caching**
   Add to Nginx config:
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=soundboard_cache:10m max_size=1g;

   location /api/sounds/ {
       proxy_cache soundboard_cache;
       proxy_cache_valid 200 1h;
       # ... rest of proxy config
   }
   ```

3. **Use CDN** (for large deployments)
   - Upload sounds to S3/CloudFront
   - Modify server to serve from CDN

## Monitoring

### Check Server Status
```bash
# Server health
curl http://localhost:3000/api/health

# List sounds
curl http://localhost:3000/api/sounds

# Docker stats
docker stats dnd-soundboard
```

### Resource Usage
```bash
# Disk space
du -sh sounds/

# Memory usage
docker stats --no-stream dnd-soundboard
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Check if port is in use
sudo lsof -i :3000

# Rebuild
docker-compose up -d --build --force-recreate
```

### Can't upload sounds
- Verify password is correct
- Check file size (<100MB)
- Check disk space: `df -h`
- Check permissions: `ls -la sounds/`

### Slow pre-loading
- Check VPS bandwidth
- Optimize audio files (use MP3 instead of WAV)
- Reduce file sizes before uploading

### Out of disk space
```bash
# Check usage
df -h

# Clean Docker
docker system prune -a

# Remove old backups
rm soundboard-backup-*.tar.gz
```

## Cost Estimates

### VPS Options (Monthly)

- **DigitalOcean Droplet**: $6/month (1GB RAM)
- **Linode Nanode**: $5/month (1GB RAM)
- **AWS Lightsail**: $5/month (1GB RAM)
- **Hetzner Cloud**: €4/month (2GB RAM)

**Recommended**: 2GB RAM for smooth operation with many sounds.

### Bandwidth

- Typical sound file: 5-10MB (3-minute MP3)
- Pre-load for 5 players: ~500MB total
- Most VPS include 1TB+ bandwidth/month

## Advanced Configuration

### Environment Variables

All available environment variables:

```env
# Server port
PORT=3000

# Authentication password
SOUNDBOARD_PASSWORD=your-password

# Optional: Custom sounds directory
SOUNDS_DIR=/custom/path/sounds

# Optional: Enable debug logging
DEBUG=true
```

### Docker Build Arguments

Custom Docker build:
```bash
docker build \
  --build-arg NODE_VERSION=18 \
  -t dnd-soundboard:custom \
  .
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/dnd-soundboard/issues
- Documentation: README.md

## License

MIT License - See LICENSE file for details
