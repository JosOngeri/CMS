#!/bin/bash

# Database setup script for KMainCMS

echo "Setting up KMainCMS database..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL is not installed or not in PATH"
    exit 1
fi

# Read database credentials
echo "Enter PostgreSQL user (default: postgres):"
read DB_USER
DB_USER=${DB_USER:-postgres}

echo "Enter PostgreSQL password:"
read -s DB_PASSWORD

echo "Enter database name (default: kmaincms):"
read DB_NAME
DB_NAME=${DB_NAME:-kmaincms}

# Create database
echo "Creating database..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

# Run migrations
echo "Running migrations..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f database/001_auth_schema.sql

echo "Database setup complete!"
echo "Update backend/.env with your database credentials"
