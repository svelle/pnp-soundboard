#!/bin/bash

# Simple deployment script for DnD Soundboard with external SSL certificates

set -e

echo "==================================="
echo "DnD Soundboard Deployment"
echo "==================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your DOMAIN variable."
    echo "Example: DOMAIN=pnp-soundboard.svelle.dev"
    exit 1
fi

# Load and export environment variables
set -a
source .env
set +a
export DOMAIN

# Check if DOMAIN is set
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN variable not set in .env file!"
    echo "Please add: DOMAIN=your-domain.com"
    exit 1
fi

echo "Domain: $DOMAIN"
echo ""

# Check if password is set
if [ -z "$SOUNDBOARD_PASSWORD" ]; then
    echo "Error: SOUNDBOARD_PASSWORD not set in .env file!"
    echo "Please add: SOUNDBOARD_PASSWORD=your-password"
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
    echo "Warning: SSL certificates not found in nginx/ssl/"
    echo ""
    echo "Please place your certificate files in nginx/ssl/:"
    echo "  - fullchain.pem (your certificate + intermediates)"
    echo "  - privkey.pem (your private key)"
    echo ""
    echo "Would you like to continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

# Generate .htpasswd file for nginx basic auth
echo ""
echo "Generating password file..."
# Using openssl to generate bcrypt hash (username: admin)
HASHED_PASSWORD=$(openssl passwd -apr1 "$SOUNDBOARD_PASSWORD")
echo "admin:$HASHED_PASSWORD" > nginx/.htpasswd
chmod 644 nginx/.htpasswd
echo "  ✓ Password file generated"

# Generate nginx configuration
echo "Step 1: Generating nginx configuration..."
envsubst '${DOMAIN}' < nginx/conf.d/soundboard.conf.template > nginx/conf.d/soundboard.conf
echo "  ✓ Nginx config generated for $DOMAIN"

# Build and start services
echo ""
echo "Step 2: Building Docker images..."
docker-compose build --no-cache

echo "Step 3: Starting services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "Step 4: Waiting for services to be ready..."
sleep 3

# Check status
echo ""
echo "Step 5: Checking service status..."
docker-compose ps

echo ""
echo "==================================="
echo "Deployment Complete!"
echo "==================================="
echo ""
echo "Your soundboard should be available at:"
echo "  https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose restart        # Restart services"
echo "  docker-compose down           # Stop services"
echo ""
