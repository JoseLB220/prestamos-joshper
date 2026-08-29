#!/bin/bash
set -e

# ==============================================================================
# SCRIPT ASISTENTE DE CONFIGURACIÓN SSL / HTTPS (Certbot + Nginx)
# ==============================================================================

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Uso: ./scripts/setup-ssl.sh <tudominio.com> <tu-email@correo.com>"
    echo "Ejemplo: ./scripts/setup-ssl.sh joshpersolutions.com admin@joshpersolutions.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "🔒 Configurando certificado SSL gratis con Certbot (Let's Encrypt)..."
echo "🌐 Dominio: $DOMAIN"
echo "📧 Email: $EMAIL"

# 1. Crear directorios para Certbot
mkdir -p nginx/ssl/live/$DOMAIN nginx/ssl/certbot

# 2. Reemplazar nombre de dominio en la plantilla nginx-ssl.conf
sed "s/DOMINIO_AQUI/$DOMAIN/g" nginx/nginx-ssl.conf > nginx/nginx-proxy.conf

# 3. Solicitar certificado SSL mediante contenedor certbot
echo "🚀 Ejecutando Certbot..."
docker run -it --rm --name certbot \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/ssl/certbot:/var/www/certbot" \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL --agree-tos --no-eff-email

# 4. Reiniciar Nginx proxy para cargar los certificados SSL
echo "🔄 Recargando Nginx con SSL..."
docker-compose exec proxy nginx -s reload || docker-compose restart proxy

echo "✅ HTTPS configurado exitosamente en https://$DOMAIN!"
