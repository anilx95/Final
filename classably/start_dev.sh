#!/usr/bin/env bash
# Convenience launcher for Mac/Linux. Windows users: run each service in its
# own PowerShell window using the commands in each folder's README instead.
set -e

echo "Starting ClassAbly backend..."
(cd backend && source venv/bin/activate 2>/dev/null || true; uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

sleep 3

echo "Starting ESP32 simulator (classroom 1)..."
(cd esp32-simulator && python3 esp32_simulator.py --classroom-id 1) &
SIM_PID=$!

echo ""
echo "All backend services starting. Backend API: http://localhost:8000"
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $SIM_PID 2>/dev/null" EXIT
wait

