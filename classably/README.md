# ClassAbly
### Smart Classroom Accessibility Platform

A full-stack platform that makes classrooms accessible for students with
physical disabilities — mobility impairments, limb differences, paralysis,
or temporary injuries — through voice control, AI note-taking, IoT
classroom automation, one-tap emergency assistance, accessible indoor
navigation, and automatic attendance.

> Think: **Google Classroom + Smart Home + Accessibility Assistant.**

---

## What makes this different from the original spec

The original brief listed 8 features and named a few things as "future
enhancements." This build does all 8 **and** pulls 3 of those "future"
ideas into working features now:

1. **Teacher Command Center** — a real-time dashboard with a live floor
   map. When a student raises an assist request, it doesn't just log to a
   database — it **pulses on the map in real time** over WebSocket, in
   front of the teacher, the moment it happens. Most similar assistive-tech
   projects only build the student-facing side; this one gives the teacher
   an eye across the whole building.
2. **Adaptive Accessibility Profiles** — the original spec lists
   "personalized accessibility profiles that auto-adjust display settings"
   as a *future enhancement*. It's built now: the system watches
   interaction signals (manual font bumps, repeated voice commands, slow
   responses) and proactively suggests a UI mode switch — and shows its
   reasoning, because a black-box suggestion isn't trustworthy in an
   accessibility tool.
3. **Offline-first resilience** — real classrooms don't always have solid
   wifi. Attendance, assist requests, and notes are designed to queue
   locally and sync in one batch the moment connectivity returns, so a
   dead wifi router doesn't mean a student can't raise their hand.

## Architecture

```
┌──────────────────┐               WebSocket              ┌──────────────────────┐
│  FastAPI Backend │ ───────────────────────────────────► │   ESP32 Simulator    │
│  SQLite / Python │                                      │ (or real hardware)   │
└──────────────────┘                                      └──────────────────────┘
```

**Backend** (`/backend`) — FastAPI + SQLite. Owns all business logic:
voice-intent parsing, local text summarization (TextRank, no API key), real
Tesseract OCR, Dijkstra-based accessible pathfinding, the adaptive-profile
rule engine, and a WebSocket manager that fans real-time events out to simulated/real ESP32 devices.

**ESP32 Simulator** (`/esp32-simulator`) — stands in for physical
relays/servos/RFID hardware, speaking the exact WebSocket protocol real
firmware would use.

## What's genuinely real vs. simulated (read this before your demo)

Being upfront about this matters more than a shinier claim:

| Piece | Status |
|---|---|
| Backend logic (voice parsing, device control, attendance, assist requests, AI notes, adaptive profiles, offline sync, accessible pathfinding) | **Real.** Actually built and tested end-to-end against a running server. |
| OCR | **Real.** Genuine local Tesseract OCR — tested against an actual generated image, not mocked. |
| Text summarization | **Real, fully local, zero API cost.** TextRank algorithm, no internet needed. |
| ESP32 device control | **Real protocol**, driving a **software simulator** standing in for hardware you haven't wired up yet. Swap the simulator process for real firmware without touching backend code. |

## Quick start

**1. Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**2. ESP32 simulator** (separate terminal)
```bash
cd esp32-simulator
pip install -r requirements.txt
python3 esp32_simulator.py --classroom-id 1
```

See each folder's own README for full detail and troubleshooting.

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite, WebSockets, sumy (TextRank), Tesseract/pytesseract
- **IoT:** WebSocket-based device protocol, ESP32-compatible

