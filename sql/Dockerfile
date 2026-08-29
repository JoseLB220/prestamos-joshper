FROM postgres:16

# Bake initialization scripts into the image. Docker Desktop file sharing can
# otherwise expose an empty bind-mounted directory inside the Linux VM.
COPY sql/*.sql /docker-entrypoint-initdb.d/
