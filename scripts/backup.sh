#!/bin/bash
# ==============================================================================
# JOSHPER SOLUTIONS - SCRIPT DE BACKUP AUTOMATIZADO DE BASE DE DATOS Y ARCHIVOS
# ==============================================================================
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -d '\n')
fi

DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-joshperdb}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

backup_database() {
    log "Iniciando respaldo de base de datos..."
    local db_backup="$BACKUP_DIR/joshper_db_${TIMESTAMP}.sql.gz"

    if command -v docker-compose >/dev/null 2>&1 && docker-compose ps -q database >/dev/null 2>&1; then
        log "Ejecutando pg_dump vía docker-compose..."
        docker-compose exec -T database pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$db_backup"
    elif command -v pg_dump >/dev/null 2>&1; then
        log "Ejecutando pg_dump localmente..."
        PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$db_backup"
    else
        error "No se encontró docker-compose ni pg_dump en el sistema."
    fi

    if [ ! -s "$db_backup" ]; then
        error "El archivo de backup está vacío o no se generó correctamente."
    fi

    log "Respaldo de base de datos generado: $db_backup ($(du -h "$db_backup" | cut -f1))"
    echo "$db_backup"
}

backup_uploads() {
    log "Iniciando respaldo de archivos uploads..."
    local uploads_backup="$BACKUP_DIR/joshper_uploads_${TIMESTAMP}.tar.gz"

    if [ -d "./uploads" ]; then
        tar -czf "$uploads_backup" -C ./uploads .
        log "Respaldo de uploads generado: $uploads_backup ($(du -h "$uploads_backup" | cut -f1))"
    elif command -v docker >/dev/null 2>&1; then
        docker run --rm -v joshper-server-2_app_uploads:/source -v "$(pwd)/$BACKUP_DIR":/backup alpine \
            tar -czf "/backup/joshper_uploads_${TIMESTAMP}.tar.gz" -C /source .
        log "Respaldo de volumen uploads generado: $uploads_backup"
    else
        log "No se encontró directorio ./uploads para respaldar."
    fi
}

clean_old_backups() {
    log "Purgando respaldos anteriores a $RETENTION_DAYS días..."
    find "$BACKUP_DIR" -name "joshper_*.gz" -mtime +"$RETENTION_DAYS" -delete || true
    log "Limpieza de respaldos antiguos completada."
}

main() {
    log "=== INICIO DE RESPALDO JOSHPER ==="
    backup_database
    backup_uploads
    clean_old_backups
    log "=== RESPALDO FINALIZADO CON ÉXITO ==="
}

trap 'error "El proceso de backup falló en la línea $LINENO"' ERR

main