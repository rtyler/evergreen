#!/bin/sh
# wait-for-postgres.sh

# Shim to avoid the service to start before the DB is really available:
# https://docs.docker.com/compose/startup-order/
# FIXME: write reconnection logic (?) -- maybe not, since this is supposed to be a local-dev only issue I guess
set -euo pipefail

host="$1"
shift
port="$1"
shift

cmd="$@"

maxAttempts=10

until psql -h "$host" -p "$port" -U "postgres" -c '\q'; do
  maxAttempts=$(( $maxAttempts - 1 ))
  if [[ $maxAttempts <= 0 ]]; then
    >&2 echo "Maximum number of attempts reached: exitting"
    exit 1
  fi
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd
