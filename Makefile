.PHONY: help clean clean-ssl clean-sounds clean-all build up down restart logs ssl-setup ssl-renew backup restore status

help:
	@echo "DnD Soundboard - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Development & Deployment:"
	@echo "  make build         - Build Docker images"
	@echo "  make up            - Start all services"
	@echo "  make down          - Stop all services"
	@echo "  make restart       - Restart all services"
	@echo "  make logs          - View logs (use Ctrl+C to exit)"
	@echo "  make status        - Show running containers"
	@echo ""
	@echo "SSL & Certificates:"
	@echo "  make ssl-setup     - Set up SSL certificates (first time)"
	@echo "  make ssl-renew     - Manually renew SSL certificates"
	@echo ""
	@echo "Data Management:"
	@echo "  make backup        - Backup sounds directory"
	@echo "  make restore       - Restore sounds from latest backup"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove SSL certificates and generated configs"
	@echo "  make clean-sounds  - Remove all uploaded sounds"
	@echo "  make clean-all     - Remove everything (SSL, sounds, Docker volumes)"
	@echo ""

# Build Docker images
build:
	docker-compose build

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# Restart services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f

# Show container status
status:
	docker-compose ps

# SSL setup (first time)
ssl-setup:
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found!"; \
		echo "Copy .env.example to .env and configure DOMAIN and EMAIL"; \
		exit 1; \
	fi
	chmod +x setup-ssl.sh
	./setup-ssl.sh

# Manually renew SSL certificates
ssl-renew:
	docker-compose run --rm certbot renew
	docker-compose restart nginx

# Backup sounds directory
backup:
	@mkdir -p backups
	@BACKUP_FILE="backups/soundboard-backup-$$(date +%Y%m%d-%H%M%S).tar.gz"; \
	echo "Creating backup: $$BACKUP_FILE"; \
	tar -czf $$BACKUP_FILE sounds/; \
	echo "Backup created successfully!"

# Restore from latest backup
restore:
	@LATEST=$$(ls -t backups/soundboard-backup-*.tar.gz 2>/dev/null | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "Error: No backups found in backups/ directory"; \
		exit 1; \
	fi; \
	echo "Restoring from: $$LATEST"; \
	tar -xzf $$LATEST; \
	docker-compose restart soundboard; \
	echo "Restore complete!"

# Clean SSL certificates and generated nginx configs
clean:
	@echo "Cleaning SSL certificates and nginx configs..."
	rm -rf certbot/conf/*
	rm -rf certbot/www/*
	rm -f nginx/conf.d/*.conf
	@echo "Clean complete! SSL certificates and configs removed."
	@echo "Run 'make ssl-setup' to set up SSL again."

# Clean uploaded sounds
clean-sounds:
	@echo "WARNING: This will delete ALL uploaded sounds!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r confirm
	rm -rf sounds/*
	docker-compose restart soundboard
	@echo "All sounds deleted."

# Clean everything (SSL, sounds, Docker volumes)
clean-all: down
	@echo "WARNING: This will delete EVERYTHING (SSL, sounds, Docker volumes)!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r confirm
	rm -rf certbot/conf/*
	rm -rf certbot/www/*
	rm -f nginx/conf.d/*.conf
	rm -rf sounds/*
	docker-compose down -v
	@echo "Complete cleanup done."
