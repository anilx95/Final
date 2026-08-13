# ClassAbly — ESP32 Device Simulator

Stands in for real ESP32 hardware while you're developing/demoing without a
physical relay board, servo desk, or RFID reader wired up yet.

It connects to the backend over the **exact same WebSocket protocol** a real
ESP32 (running Arduino/MicroPython with a WebSocket client library) would
use — so swapping this simulator for real firmware later means changing
zero backend code.

## What it does

- Connects to `ws://<backend>/ws/device/classroom-<id>`
- Listens for commands pushed from the backend (lights, fan, curtains,
  projector slide, desk height, door lock) and prints them as if actuating
  a relay/servo
- Periodically sends simulated telemetry (RFID tap events, distance-sensor
  readings) back up to the backend, which relays it to the Teacher Command
  Center live

## Run

```bash
cd esp32-simulator
pip install -r requirements.txt --break-system-packages   # or use a venv
python3 esp32_simulator.py --classroom-id 1
```

Run one instance per classroom you want to simulate (`--classroom-id 2`,
`--classroom-id 3`, ...) for a multi-room demo.

## Going to real hardware

For actual ESP32 firmware, the device just needs to:
1. Connect to `ws://<backend-ip>:8000/ws/device/classroom-<id>` on boot
2. On receiving a JSON command like `{"device_type": "light", "state": {"on": true}}`, drive the matching GPIO/relay
3. Send JSON telemetry (e.g. `{"event": "rfid_tap", "tag": "..."}`) whenever
   a sensor fires

Any Arduino WebSocket client library (e.g. `arduinoWebSockets`) or
MicroPython's `uwebsockets` will work — the protocol is plain JSON text
frames, nothing ESP32-simulator-specific.
