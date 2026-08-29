@echo off
echo Limpiando y reconstruyendo el entorno...

:: Detener contenedores
docker-compose down

:: Eliminar volúmenes
docker volume rm joshper-server-2_postgres_data joshper-server-2_app_uploads 2>nul

:: Crear directorios necesarios
mkdir nginx 2>nul
mkdir logs 2>nul
mkdir uploads 2>nul
mkdir uploads\receipts 2>nul
mkdir uploads\docs 2>nul

:: Crear .env si no existe
if not exist .env (
    echo DB_NAME=joshperdb> .env
    echo DB_USER=postgres>> .env
    echo DB_PASSWORD=postgres>> .env
    echo APP_URL=http://localhost:8080>> .env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production>> .env
)

:: Iniciar servicios
echo Iniciando servicios...
docker-compose up -d

:: Mostrar estado
echo.
echo Estado de los servicios:
docker-compose ps

echo.
echo Accesos:
echo   Aplicación y Archivos: http://localhost:8080
echo   Base de datos:         localhost:5433
echo.
echo Para ver los logs use: docker-compose logs -f