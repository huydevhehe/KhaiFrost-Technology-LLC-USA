#!/bin/bash
set -e

PROJECT_DIR="/srv/khaifrost"

echo ">>> Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin master

echo ">>> Building backend..."
cd "$PROJECT_DIR/backend"
npm install
npm run build
npm run migration:run

echo ">>> Building frontend..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build

echo ">>> Restarting services..."
pm2 restart khaifrost-api
pm2 restart khaifrost-web

echo ">>> Deploy done."
pm2 list
