# ClassAbly — Backend

FastAPI backend for the ClassAbly Smart Classroom Accessibility Platform.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

You also need the Tesseract OCR binary installed system-wide (the Python
`pytesseract` package is just a wrapper around it):

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr

# Windows: install from https://github.com/UB-Mannheim/tesseract/wiki
# then set pytesseract.pytesseract.tesseract_cmd if it's not on PATH

# macOS
brew install tesseract
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs (interactive): http://localhost:8000/docs
- Health check: http://localhost:8000/health

The backend is configured via `.env` and currently uses PostgreSQL.
Ensure `DATABASE_URL` and `REDIS_URL` are set correctly before starting the service.

## What's real vs. simulated here

| Feature | Status |
|---|---|
| Voice intent parsing, device control, attendance, assist requests, notes, adaptive profiles, offline sync, navigation pathfinding | **Fully real** — genuine logic, real DB, real WebSocket push |
| OCR | **Fully real** — actual Tesseract OCR, no mocking |
| Text summarization | **Fully real, fully local** — TextRank algorithm (sumy), no API key, no internet needed |
| Speech-to-text / text-to-speech | Happens **client-side** (browser Web Speech API / Flutter speech_to_text + flutter_tts) — free, zero API cost, zero server round-trip |
| ESP32 device control | **Real WebSocket protocol**, driving a **simulator** (`esp32-simulator/`) standing in for physical hardware — swap the simulator for real firmware without changing any backend code |

## Windows notes (PowerShell)

Since PowerShell venv/activation has bitten you before on other projects:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
# If you get an execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
pip install -r requirements.txt
```
