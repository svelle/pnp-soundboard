.PHONY: help clean clean-sounds clean-all build up down restart logs deploy backup restore status

help:
	@echo "DnD Soundboard - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Development & Deployment:"
	@echo "  make deploy        - Deploy with SSL (recommended)"
	@echo "  make build         - Build Docker images"
	@echo "  make up            - Start all services"
	@echo "  make down          - Stop all services"
	@echo "  make restart       - Restart all services"
	@echo "  make logs          - View logs (use Ctrl+C to exit)"
	@echo "  make status        - Show running containers"
	@echo ""
	@echo "Data Management:"
	@echo "  make backup        - Backup sounds directory"
	@echo "  make restore       - Restore sounds from latest backup"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove generated nginx configs"
	@echo "  make clean-sounds  - Remove all uploaded sounds"
	@echo "  make clean-all     - Remove everything (configs, sounds, Docker volumes)"
	@echo ""

# Build Docker images
build:
	docker-compose build --no-cache

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

# Deploy with SSL configuration
deploy:
	@if [ ! -f .env ]; then \
		echo "Error: .env file not found!"; \
		echo "Copy .env.example to .env and configure DOMAIN"; \
		exit 1; \
	fi
	@chmod +x deploy.sh
	@./deploy.sh

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

# Clean generated nginx configs
clean:
	@echo "Cleaning generated nginx configs..."
	rm -f nginx/conf.d/*.conf
	@echo "Clean complete! Generated configs removed."
	@echo "Run 'make deploy' to regenerate and deploy."

# Clean uploaded sounds
clean-sounds:
	@echo "WARNING: This will delete ALL uploaded sounds!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r confirm
	rm -rf sounds/*
	docker-compose restart soundboard
	@echo "All sounds deleted."

# Clean everything (configs, sounds, Docker volumes)
clean-all: down
	@echo "WARNING: This will delete EVERYTHING (configs, sounds, Docker volumes)!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r confirm
	rm -f nginx/conf.d/*.conf
	rm -rf sounds/*
	docker-compose down -v
	@echo "Complete cleanup done."
