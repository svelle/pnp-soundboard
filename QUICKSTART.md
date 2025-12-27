# Quick Start Guide

## For Users With Existing SSL Certificates

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/dnd-soundboard.git
cd dnd-soundboard
cp .env.example .env
nano .env  # Set DOMAIN and SOUNDBOARD_PASSWORD
```

### 2. Copy Your SSL Certificates

**Let's Encrypt users:**
```bash
cd nginx/ssl
rm -f fullchain.pem privkey.pem  # Remove symlinks
sudo cp /etc/letsencrypt/live/YOUR-DOMAIN/fullchain.pem fullchain.pem
sudo cp /etc/letsencrypt/live/YOUR-DOMAIN/privkey.pem privkey.pem
sudo chown $USER:$USER fullchain.pem privkey.pem
chmod 644 fullchain.pem
chmod 600 privkey.pem
cd ../..
```

**Other certificate providers:**
```bash
cp /path/to/your/fullchain.pem nginx/ssl/fullchain.pem
cp /path/to/your/privkey.pem nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### 3. Deploy

```bash
make deploy
```

Or manually:
```bash
export DOMAIN=your-domain.com
envsubst '${DOMAIN}' < nginx/conf.d/soundboard.conf.template > nginx/conf.d/soundboard.conf
docker-compose up -d --build
```

### 4. Access

Visit: `https://your-domain.com`

## Common Commands

```bash
make help          # Show all commands
make logs          # View logs
make restart       # Restart services
make backup        # Backup sounds
make clean         # Clean configs
```

## Troubleshooting

**Nginx won't start:**
```bash
# Check if certificates exist
ls -la nginx/ssl/

# Check nginx logs
docker-compose logs nginx
```

**Certificate errors:**
```bash
# Verify files are actual files (not symlinks)
file nginx/ssl/fullchain.pem
file nginx/ssl/privkey.pem

# Should show: "PEM certificate" and "private key"
# If it shows "symbolic link", copy the actual files instead
```

For detailed documentation, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [SETUP-SSL.md](SETUP-SSL.md) - SSL setup details
- [README.md](README.md) - Feature overview
