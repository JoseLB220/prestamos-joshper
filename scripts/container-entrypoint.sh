#!/bin/sh
set -e

# Ensure uploads directory exists and has correct ownership before dropping privileges
mkdir -p /app/uploads /app/public/uploads
chown -R nextjs:nodejs /app/uploads /app/public/uploads || true

# Exec the given command as the unprivileged user using su-exec
exec su-exec nextjs "$@"
