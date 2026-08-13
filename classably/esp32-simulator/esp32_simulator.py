"""
ESP32 Device Simulator
=======================
Stands in for real ESP32 hardware during development/demo. Connects to the
backend's /ws/device/{device_id} endpoint exactly the way a real ESP32
running MicroPython/Arduino WebSocket client would, so swapping this out
for real firmware later is a protocol-compatible drop-in, not a rewrite.

What it does:
  - Listens for commands pushed from the backend (light/fan/desk/etc. state
    changes) and prints them as if actuating a relay/servo.
  - Periodically simulates an RFID tap and a distance-sensor reading (for
    the smart cane / indoor-nav-adjacent obstacle detection), sending
    telemetry back up to the backend, which relays it to the teacher
    dashboard in real time.

Run: python3 esp32_simulator.py --classroom-id 1
"""
import argparse
import asyncio
import json
import random
from datetime import datetime

import websockets

RFID_TAGS = ["RFID001", "RFID002", "RFID003"]


async def run_simulator(classroom_id: int, backend_host: str):
    device_id = f"classroom-{classroom_id}"
    uri = f"ws://{backend_host}/ws/device/{device_id}"

    print(f"[ESP32-SIM] Connecting to {uri} ...")
    async with websockets.connect(uri) as ws:
        print(f"[ESP32-SIM] Connected as '{device_id}'. Waiting for commands / sending telemetry.\n")

        async def listen_for_commands():
            async for message in ws:
                cmd = json.loads(message)
                dtype = cmd.get("device_type")
                state = cmd.get("state")
                ts = datetime.now().strftime("%H:%M:%S")
                if dtype == "light":
                    print(f"[{ts}] RELAY -> lights: {'ON' if state.get('on') else 'OFF'}")
                elif dtype == "fan":
                    print(f"[{ts}] RELAY -> fan: {'ON' if state.get('on') else 'OFF'}")
                elif dtype == "desk":
                    print(f"[{ts}] SERVO -> desk height set to {state.get('height_cm')} cm")
                elif dtype == "curtain":
                    print(f"[{ts}] MOTOR -> curtains {'OPEN' if state.get('open') else 'CLOSED'}")
                elif dtype == "projector":
                    print(f"[{ts}] SMART BOARD -> slide {state.get('slide')}, power={'ON' if state.get('on') else 'OFF'}")
                elif dtype == "door_relay":
                    print(f"[{ts}] RELAY -> door {'LOCKED' if state.get('locked') else 'UNLOCKED'}")
                else:
                    print(f"[{ts}] Unrecognized command: {cmd}")

        async def emit_telemetry():
            while True:
                await asyncio.sleep(random.uniform(8, 15))
                event = random.choice(["rfid_tap", "distance_check"])
                if event == "rfid_tap":
                    payload = {"event": "rfid_tap", "tag": random.choice(RFID_TAGS)}
                else:
                    payload = {"event": "distance_check", "cm": random.randint(30, 400)}
                await ws.send(json.dumps(payload))
                print(f"[ESP32-SIM] -> telemetry sent: {payload}")

        await asyncio.gather(listen_for_commands(), emit_telemetry())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--classroom-id", type=int, default=1)
    parser.add_argument("--backend-host", default="localhost:8000")
    args = parser.parse_args()

    try:
        asyncio.run(run_simulator(args.classroom_id, args.backend_host))
    except KeyboardInterrupt:
        print("\n[ESP32-SIM] Stopped.")
