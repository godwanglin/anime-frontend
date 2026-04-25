#!/bin/bash
set -e

cd /home/www/app-anime/frontend-app

echo "Syncing frontend with GitHub..."
git remote set-url origin https://github.com/xiaoycailin/anime-frontend.git
git fetch origin
git reset --hard origin/main
git clean -fd

echo "Installing frontend dependencies..."
# if [ -f package-lock.json ]; then
# 	npm ci --include=dev || npm install --include=dev
# else
# fi

npm install --include=dev

echo "Building frontend..."
npm run build

echo "Starting frontend with PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
	npm install -g pm2
fi

APP_NAME="anime-app"
APP_PORT="8245"
APP_HOST="0.0.0.0"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
	HOST="$APP_HOST" PORT="$APP_PORT" pm2 restart "$APP_NAME" --update-env
else
	HOST="$APP_HOST" PORT="$APP_PORT" pm2 start npm --name "$APP_NAME" -- run start
fi

pm2 save
echo "Frontend service '$APP_NAME' is running on port $APP_PORT."
