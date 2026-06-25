#!/bin/bash

echo "🔄 Iniciando proceso de migración y actualización..."

# 1. Detener y eliminar los contenedores actuales
echo "🛑 Deteniendo contenedores..."
docker-compose down

# 2. Eliminar el volumen de las imágenes si es necesario recrearlo
read -p "¿Desea eliminar y recrear el volumen de imágenes? (s/n): " recreate_volume
if [ "$recreate_volume" = "s" ]; then
    echo "🗑️ Eliminando volumen joshper-uploads..."
    docker volume rm joshper-server-2_joshper-uploads
fi

# 3. Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p uploads/receipts

# 4. Aplicar cambios en la base de datos
echo "💾 Aplicando cambios en la base de datos..."
docker-compose up db -d
sleep 5  # Esperar a que la base de datos esté lista
echo "Ejecutando script de migración de la base de datos..."
docker exec joshper-db psql -U postgres -d joshperdb -f /docker-entrypoint-initdb.d/02-add-document-migrated.sql

# 5. Iniciar el resto de los servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

# 6. Ejecutar el script de migración de data URLs
echo "🔄 Ejecutando migración de data URLs..."
sleep 5  # Esperar a que la aplicación esté lista
docker exec joshper-app npx ts-node scripts/migrate-data-urls.ts

# 7. Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

echo "✅ Proceso completado!"