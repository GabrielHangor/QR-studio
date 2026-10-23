#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker info --format '{{.ServerVersion}}' > /dev/null
container_name="qr-studio-test-$(node -p 'crypto.randomUUID()')"
test_pid=""

cleanup() {
  local status=$?
  trap - EXIT INT TERM HUP
  if [[ -n "$test_pid" ]]; then
    kill -TERM -- "-$test_pid" 2> /dev/null || true
    # Ace watch mode may keep its supervisor alive after SIGTERM.
    sleep 3
    kill -KILL -- "-$test_pid" 2> /dev/null || true
    wait "$test_pid" 2> /dev/null || true
  fi
  if docker rm --force --volumes "$container_name" > /dev/null; then
    echo 'Temporary PostgreSQL removed'
  elif [[ "$status" -eq 0 ]]; then
    status=1
  fi
  exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

export NODE_ENV=test TZ=UTC HOST=127.0.0.1 LOG_LEVEL=error
export DB_HOST=127.0.0.1 DB_USER=qr_studio DB_DATABASE=qr_studio_test
export SESSION_DRIVER=database CORS_ORIGIN=http://127.0.0.1:5173
DB_PASSWORD=$(node -p 'crypto.randomBytes(24).toString("hex")')
APP_KEY=$(node -p 'crypto.randomBytes(32).toString("base64")')
export DB_PASSWORD APP_KEY

echo "Starting temporary PostgreSQL: $container_name"
docker run --detach --rm --name "$container_name" \
  --label qr-studio.backend-tests=true \
  --env "POSTGRES_USER=$DB_USER" \
  --env "POSTGRES_PASSWORD=$DB_PASSWORD" \
  --env "POSTGRES_DB=$DB_DATABASE" \
  --publish 127.0.0.1::5432 \
  --tmpfs /var/lib/postgresql/data \
  postgres:17-alpine > /dev/null

deadline=$((SECONDS + 60))
until docker exec "$container_name" pg_isready \
  -h 127.0.0.1 -U "$DB_USER" -d "$DB_DATABASE" -t 1 > /dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo 'PostgreSQL did not become ready within 60 seconds' >&2
    docker logs "$container_name" >&2
    exit 1
  fi
  sleep 1
done

DB_PORT=$(docker port "$container_name" 5432/tcp)
DB_PORT=${DB_PORT##*:}
PORT=$(node --input-type=module -e '
  import { createServer } from "node:net";
  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    console.log(server.address().port);
    server.close();
  });
')
export DB_PORT PORT
export APP_URL="http://127.0.0.1:$PORT"

echo "Running backend tests (PostgreSQL $DB_PORT, HTTP $PORT)"
# Give Ace and its children a process group so traps also stop watch mode.
set -m
node ace.js test --no-clear "$@" &
test_pid=$!
status=0
wait "$test_pid" || status=$?
test_pid=""
exit "$status"
