#!/bin/bash

echo "🔄 Iniciando proceso de migración y actualización..."

# 1. Detener los contenedores actuales
echo "🛑 Deteniendo contenedores..."
docker-compose down

# 2. Eliminar el volumen de las imágenes si es necesario recrearlo
read -p "¿Desea eliminar y recrear el volumen de uploads? (s/n): " recreate_volume
if [ "$recreate_volume" = "s" ]; then
    echo "🗑️ Eliminando volumen app_uploads..."
    docker volume rm joshper-server-2_app_uploads 2>/dev/null || true
fi

# 3. Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p uploads/receipts uploads/docs logs

# 4. Iniciar base de datos
echo "💾 Iniciando base de datos..."
docker-compose up -d database
sleep 5  # Esperar a que la base de datos esté lista

# 5. Iniciar todos los servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

# 6. Ejecutar migraciones incrementales
echo "🔄 Ejecutando migraciones de base de datos..."
docker exec joshper-app node scripts/migrate.js || true

# 7. Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

echo "✅ Proceso completado exitosamente!"