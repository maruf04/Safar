#!/usr/bin/env bash
# Run Safar locally: PostgreSQL check -> backend (port 5000) -> frontend (port 3001).
# Usage:  ./run.sh            start everything
#         ./run.sh backend    start only the backend
#         ./run.sh frontend   start only the frontend
# Press Ctrl+C to stop everything this script started.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/Safar-Backend/Backendd"
FRONTEND_DIR="$ROOT/Safar-Frontend"
BACKEND_PORT=5000
FRONTEND_PORT=3001
MODE="${1:-all}"

green()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[1;31m%s\033[0m\n' "$*" >&2; }

PIDS=()
cleanup() {
  if ((${#PIDS[@]})); then
    yellow "Stopping Safar..."
    for pid in "${PIDS[@]}"; do
      # kill the whole process group (npm + node children)
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    PIDS=()
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

need() { command -v "$1" >/dev/null 2>&1 || { red "'$1' is not installed."; exit 1; }; }

port_busy() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

install_deps() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    yellow "Installing npm packages in ${dir#$ROOT/}..."
    (cd "$dir" && npm install)
  fi
}

# Prefix each output line with a coloured tag so backend/frontend logs are easy to tell apart
tag() { local label="$1" color="$2"; while IFS= read -r line; do printf '\033[%sm[%s]\033[0m %s\n' "$color" "$label" "$line"; done; }

check_postgres() {
  if command -v systemctl >/dev/null && ! systemctl is-active --quiet postgresql; then
    yellow "PostgreSQL is not running. Starting it (may ask for your sudo password)..."
    sudo systemctl start postgresql
  fi
  if command -v pg_isready >/dev/null && ! pg_isready -h localhost -p 5432 -q; then
    red "PostgreSQL is not accepting connections on localhost:5432."
    exit 1
  fi
  green "✓ PostgreSQL is running"
}

start_backend() {
  if port_busy "$BACKEND_PORT"; then
    yellow "Port $BACKEND_PORT is already in use — assuming the backend is already running."
    return
  fi
  install_deps "$BACKEND_DIR"
  green "Starting backend on http://localhost:$BACKEND_PORT ..."
  # setsid gives it its own process group so Ctrl+C cleanup stops npm and node together
  (cd "$BACKEND_DIR" && exec setsid node server/server.js) > >(tag backend 36) 2>&1 &
  PIDS+=("$!")

  # Wait until the API answers (up to ~30s)
  for _ in $(seq 1 60); do
    if curl -s -o /dev/null "http://localhost:$BACKEND_PORT/booking/getStations"; then
      green "✓ Backend is up"
      return
    fi
    sleep 0.5
  done
  red "Backend did not respond on port $BACKEND_PORT. Check the [backend] log above."
  exit 1
}

start_frontend() {
  if port_busy "$FRONTEND_PORT"; then
    yellow "Port $FRONTEND_PORT is already in use — is the frontend already running?"
    return
  fi
  install_deps "$FRONTEND_DIR"
  green "Starting frontend on http://localhost:$FRONTEND_PORT ..."
  # BROWSER=none stops CRA from opening a tab automatically; remove it if you want that
  (cd "$FRONTEND_DIR/src" && exec setsid env BROWSER=none npm start) > >(tag frontend 35) 2>&1 &
  PIDS+=("$!")
}

need node
need npm
need curl

case "$MODE" in
  all)      check_postgres; start_backend; start_frontend ;;
  backend)  check_postgres; start_backend ;;
  frontend) start_frontend ;;
  *)        red "Unknown option '$MODE'. Use: all | backend | frontend"; exit 1 ;;
esac

if ((${#PIDS[@]} == 0)); then
  green "Nothing new to start."
  exit 0
fi

green "Safar is starting. Open http://localhost:$FRONTEND_PORT  (Ctrl+C to stop)"
wait
