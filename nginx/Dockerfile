FROM nginx:alpine

# Bake the proxy configuration into the image. This avoids fragile file bind
# mounts on Docker Desktop for Windows.
COPY nginx/nginx-proxy.conf /etc/nginx/conf.d/default.conf
