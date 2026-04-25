#!/bin/bash
set -e

SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_BACKUP="$(mktemp)"
cp "$SCRIPT_PATH" "$SCRIPT_BACKUP"

cd /home/www/app-anime/frontend-app

echo "Syncing frontend with GitHub..."
git remote set-url origin https://github.com/xiaoycailin/anime-frontend.git
git fetch origin
git reset --hard origin/main
git clean -fd
cp "$SCRIPT_BACKUP" deploy.sh
chmod +x deploy.sh
rm -f "$SCRIPT_BACKUP"

echo "Installing frontend dependencies..."
if [ -f package-lock.json ]; then
	npm ci --include=dev
else
	npm install --include=dev
fi

echo "Building frontend..."
npm run build

echo "Frontend build complete. Service not started."
