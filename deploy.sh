#!/bin/bash
set -e

cd /home/www/app-anime/frontend-app

echo "Syncing frontend with GitHub..."
git remote set-url origin https://github.com/xiaoycailin/anime-frontend.git
git fetch origin
git reset --hard origin/main
git clean -fd

echo "Installing frontend dependencies..."
if [ -f package-lock.json ]; then
	npm ci --include=dev || npm install --include=dev
else
	npm install --include=dev
fi

echo "Building frontend..."
npm run build

echo "Frontend build complete. Service not started."
