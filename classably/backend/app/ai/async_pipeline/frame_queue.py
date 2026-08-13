"""
Shared queues used by the asynchronous AI pipeline.
"""

from queue import Queue
from threading import Lock
from typing import Any

# ------------------------------------------------------------------
# Incoming frame queue
# ------------------------------------------------------------------

FRAME_QUEUE: Queue[dict[str, Any]] = Queue(maxsize=10)

# ------------------------------------------------------------------
# Voice announcement queue
# ------------------------------------------------------------------

VOICE_QUEUE: Queue[str] = Queue(maxsize=50)

# ------------------------------------------------------------------
# Request result storage
# ------------------------------------------------------------------

REQUEST_RESULTS: dict[str, Any] = {}

REQUEST_LOCK = Lock()