.PHONY: help install dev build start stop clean logs test test-parallel test-watch migrate migrate-create seed

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development server
	docker compose up --build

build: ## Build the application
	docker compose build

start: ## Start the application
	docker compose up -d

stop: ## Stop the application
	docker-compose down

clean: ## Clean up containers and volumes
	docker compose down -v --remove-orphans
	docker system prune -f

logs: ## Show application logs
	docker compose logs -f app

test: ## Run all tests sequentially
	docker compose -f docker-compose.test.yml run --rm test-app npm test && docker compose -f docker-compose.test.yml down -v

test-parallel: ## Run tests in parallel
	docker compose -f docker-compose.test.yml run --rm -e TEST_PARALLEL=true test-app npm run test:parallel && docker compose -f docker-compose.test.yml down -v

test-watch: ## Run tests in watch mode
	docker compose -f docker-compose.test.yml up test-app

migrate: ## Run database migrations
	docker compose exec app npm run migration:run

migrate-create: ## Create a new migration
	docker compose exec app npm run migration:create

seed: ## Run database seeds
	docker compose exec app npm run seed
