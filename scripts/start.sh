#!/bin/bash

echo "🚀 Starting ngelive by Stegripe Development"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example"
    cp .env.example .env
    echo "✅ Please configure your .env file before running again"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
pnpm db:generate

# Push database schema
echo "📊 Pushing database schema..."
pnpm db:push

# Seed database
echo "🌱 Seeding database..."
pnpm db:seed

# Start development server
echo "🎬 Starting development server..."
pnpm dev
