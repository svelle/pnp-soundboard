#!/bin/bash

# SSL Setup Script for DnD Soundboard
# This script helps you obtain and configure Let's Encrypt SSL certificates

set -e

echo "==================================="
echo "DnD Soundboard SSL Setup"
echo "==================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your DOMAIN variable."
    echo "Example: DOMAIN=soundboard.example.com"
    exit 1
fi

# Load environment variables and export them
set -a
source .env
set +a

# Check if DOMAIN is set
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN variable not set in .env file!"
    echo "Please add: DOMAIN=your-domain.com"
    exit 1
fi

# Check if EMAIL is set
if [ -z "$EMAIL" ]; then
    echo "Error: EMAIL variable not set in .env file!"
    echo "Please add: EMAIL=your-email@example.com"
    echo "(This is required for Let's Encrypt certificate notifications)"
    exit 1
fi

# Ensure variables are exported for envsubst
export DOMAIN
export EMAIL

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if valid certificates already exist
CERT_PATH="./certbot/conf/live/$DOMAIN/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
    echo "Valid certificates already exist for $DOMAIN"
    echo "Would you like to renew them? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Exiting..."
        exit 0
    fi
    RENEW=true
else
    RENEW=false
    # Clean up any incomplete certificate directories
    if [ -d "./certbot/conf/live/$DOMAIN" ]; then
        echo "Cleaning up incomplete certificate directory..."
        rm -rf "./certbot/conf/live/$DOMAIN"
        rm -rf "./certbot/conf/archive/$DOMAIN"
        rm -rf "./certbot/conf/renewal/$DOMAIN.conf"
    fi
fi

# Step 1: Create initial HTTP-only nginx config
echo "Step 1: Setting up initial HTTP configuration..."
envsubst '${DOMAIN}' < nginx/conf.d/soundboard-init.conf.template > nginx/conf.d/soundboard.conf

# Step 2: Start services
echo "Step 2: Starting services..."
docker-compose up -d soundboard nginx

# Wait for nginx to be ready
echo "Waiting for nginx to be ready..."
sleep 5

# Step 3: Obtain SSL certificate
echo "Step 3: Obtaining SSL certificate from Let's Encrypt..."
if [ "$RENEW" = true ]; then
    docker-compose run --rm certbot renew
else
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"
fi

# Check if certificate was obtained successfully
if [ ! -f "$CERT_PATH" ]; then
    echo ""
    echo "==================================="
    echo "ERROR: Certificate not obtained!"
    echo "==================================="
    echo ""
    echo "Please check:"
    echo "1. Your domain DNS points to this server's IP address"
    echo "2. Ports 80 and 443 are open in your firewall"
    echo "3. No other web server is running on port 80"
    echo ""
    echo "Check the logs above for more details."
    exit 1
fi

# Step 4: Update nginx config to use SSL
echo "Step 4: Updating nginx configuration to use SSL..."
envsubst '${DOMAIN}' < nginx/conf.d/soundboard.conf.template > nginx/conf.d/soundboard.conf

# Step 5: Restart nginx to apply SSL config
echo "Step 5: Restarting nginx with SSL configuration..."
docker-compose restart nginx

# Step 6: Start certbot for auto-renewal
echo "Step 6: Starting certbot for automatic renewal..."
docker-compose up -d certbot

echo ""
echo "==================================="
echo "SSL Setup Complete!"
echo "==================================="
echo ""
echo "Your soundboard is now available at:"
echo "  https://$DOMAIN"
echo ""
echo "Certificates will auto-renew every 12 hours."
echo ""
