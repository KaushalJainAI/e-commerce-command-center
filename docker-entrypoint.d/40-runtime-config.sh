#!/bin/sh
# Generate the SPA runtime config (window.APP_CONFIG) from container env vars.
# This runs on every container start (nginx:alpine executes /docker-entrypoint.d/*.sh),
# so the API URL is controlled by the server's env — no image rebuild required.
set -e

API_URL="${API_URL:-https://nidhimasala.com/api}"

cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  API_URL: "${API_URL}"
};
EOF

echo "[runtime-config] API_URL=${API_URL}"
