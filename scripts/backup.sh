#!/bin/bash
set -e

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# Verificar dependencias
check_dependencies() {
    command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose no está instalado"
}

# Backup de base de datos
backup_database() {
    log "Iniciando backup de base de datos..."
    
    local db_backup="$BACKUP_DIR/db_${TIMESTAMP}.dump"
    
    docker-compose exec -T database pg_dump -U $DB_USER -d $DB_NAME -F c -v -f /tmp/backup.dump
    docker cp $(docker-compose ps -q database):/tmp/backup.dump $db_backup
    docker-compose exec -T database rm -f /tmp/backup.dump
    
    # Verificar backup
    if [ ! -f "$db_backup" ] || [ ! -s "$db_backup" ]; then
        error "El backup de la base de datos falló o está vacío"
    fi
    
    log "Backup de BD completado: $db_backup ($(du -h $db_backup | cut -f1))"
    echo $db_backup
}

# Backup de archivos uploads
backup_uploads() {
    log "Iniciando backup de archivos uploads..."
    
    local uploads_backup="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
    
    docker run --rm -v joshper-server-2_app_uploads:/source -v $(pwd)/$BACKUP_DIR:/backup alpine \
        tar -czf /backup/uploads_${TIMESTAMP}.tar.gz -C /source .
    
    log "Backup de uploads completado: $uploads_backup ($(du -h $uploads_backup | cut -f1))"
    echo $uploads_backup
}

# Limpiar backups antiguos
clean_old_backups() {
    log "Limpiando backups antiguos (> $RETENTION_DAYS días)..."
    
    find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
    find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    log "Limpieza completada"
}

# Verificar espacio en disco
check_disk_space() {
    local available=$(df . | awk 'NR==2 {print $4}')
    local required=3145728  # 3GB en KB
    
    if [ $available -lt $required ]; then
        error "Espacio en disco insuficiente. Disponible: ${available}KB, Requerido: ${required}KB"
    fi
}

# Función principal
main() {
    log "=== INICIANDO BACKUP AUTOMATIZADO ==="
    
    check_dependencies
    check_disk_space
    
    # Crear directorio de backups si no existe
    mkdir -p $BACKUP_DIR
    
    # Realizar backups
    db_file=$(backup_database)
    uploads_file=$(backup_uploads)
    
    # Limpiar backups antiguos
    clean_old_backups
    
    log "=== BACKUP COMPLETADO EXITOSAMENTE ==="
    log "Archivos creados:"
    log " - Base de datos: $db_file"
    log " - Uploads: $uploads_file"
}

# Manejo de errores
trap 'error "Backup falló en línea $LINENO"' ERR

main
#!/bin/bash

# Variables de entorno requeridas:
# DB_HOST: Host de la base de datos
# DB_USER: Usuario de la base de datos
# DB_NAME: Nombre de la base de datos
# DB_PASSWORD: Contraseña de la base de datos

# Configuración de backup
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/joshper_db_backup_$TIMESTAMP.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

# Asegurar que el directorio de backup existe
mkdir -p $BACKUP_DIR

# Función de limpieza
cleanup_old_backups() {
    find $BACKUP_DIR -name "joshper_db_backup_*.sql.gz" -type f -mtime +7 -delete
}

# Realizar backup
echo "Iniciando backup de la base de datos..."
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup completado. Comprimiendo archivo..."
    gzip $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo "Backup exitoso: $COMPRESSED_FILE"
        echo "Tamaño del backup: $(du -h $COMPRESSED_FILE | cut -f1)"
        
        # Limpiar backups antiguos
        echo "Limpiando backups antiguos..."
        cleanup_old_backups
    else
        echo "Error al comprimir el backup"
        exit 1
    fi
else
    echo "Error al crear el backup"
    exit 1
fi