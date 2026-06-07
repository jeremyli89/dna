#!/usr/bin/env bash
# Quick local dev startup — runs backend + frontend concurrently
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "⚡ Starting Spotify DNA"
echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Prereqs: PostgreSQL running on localhost:5432 with database 'spotify_dna'"
echo "  createdb spotify_dna  (if it doesn't exist)"
echo ""

# Start backend
cd "$ROOT/backend"
python3.14 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
