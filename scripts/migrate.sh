#!/bin/bash

# Database migration script for Shared Shopping List application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
load_env() {
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        print_warning "No .env file found, using default values"
        export POSTGRES_DB=${POSTGRES_DB:-shopping_lists}
        export POSTGRES_USER=${POSTGRES_USER:-shopping_user}
        export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-shopping_pass}
    fi
}

# Check if database is accessible
check_database() {
    print_status "Checking database connection..."
    
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB > /dev/null 2>&1; then
        print_status "Database is accessible"
    else
        print_error "Cannot connect to database. Make sure PostgreSQL is running."
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Execute the init.sql script
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -f /docker-entrypoint-initdb.d/init.sql
    
    print_status "Database migrations completed successfully"
}

# Backup database
backup_database() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_status "Creating database backup: $backup_file"
    
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "backups/$backup_file"
    
    print_status "Database backup created: backups/$backup_file"
}

# Restore database from backup
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file to restore from"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring database from: $backup_file"
    
    # Drop and recreate database
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -c "CREATE DATABASE $POSTGRES_DB;"
    
    # Restore from backup
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB < "$backup_file"
    
    print_status "Database restored successfully"
}

# Show database status
show_status() {
    print_status "Database Status:"
    
    # Show database size
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT 
            pg_size_pretty(pg_database_size('$POSTGRES_DB')) as database_size;
    "
    
    # Show table counts
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT 
            'shopping_lists' as table_name,
            COUNT(*) as row_count
        FROM shopping_lists
        UNION ALL
        SELECT 
            'list_items' as table_name,
            COUNT(*) as row_count
        FROM list_items;
    "
}

# Create backups directory if it doesn't exist
mkdir -p backups

# Main script logic
case "${1:-status}" in
    "migrate")
        load_env
        check_database
        run_migrations
        ;;
    "backup")
        load_env
        check_database
        backup_database
        ;;
    "restore")
        load_env
        check_database
        restore_database "$2"
        ;;
    "status")
        load_env
        check_database
        show_status
        ;;
    *)
        echo "Usage: $0 {migrate|backup|restore|status}"
        echo ""
        echo "Commands:"
        echo "  migrate           - Run database migrations"
        echo "  backup            - Create database backup"
        echo "  restore <file>    - Restore database from backup"
        echo "  status            - Show database status (default)"
        exit 1
        ;;
esac