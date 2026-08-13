from pathlib import Path

import torch

# ==========================================================
# Project Paths
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "models" / "yolo11n.pt"

# ==========================================================
# Device Configuration
# ==========================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

USE_GPU = torch.cuda.is_available()

ENABLE_HALF_PRECISION = USE_GPU

# ==========================================================
# YOLO Configuration
# ==========================================================

CONFIDENCE_THRESHOLD = 0.25

IMAGE_SIZE = 640

MAX_DETECTIONS = 100

YOLO_VERBOSE = False

YOLO_WARMUP = True

# ==========================================================
# OCR Configuration
# ==========================================================

LANGUAGE = "en"

USE_ANGLE_CLASSIFIER = True

SHOW_LOG = False

MIN_TEXT_SCORE = 0.60

OCR_REGION_TOP = 0.05
OCR_REGION_BOTTOM = 0.50

OCR_REGION_LEFT = 0.10
OCR_REGION_RIGHT = 0.90

MIN_TEXT_LENGTH = 3

MAX_TEXT_LENGTH = 5000

SAVE_OCR_IMAGES = False

# ==========================================================
# Streaming Configuration
# ==========================================================

STREAM_INTERVAL_MS = 300

ANNOUNCE_COOLDOWN = 5

# ==========================================================
# AI Pipeline Configuration
# ==========================================================

ENABLE_OBJECT_DETECTION = True

ENABLE_OCR = True

ENABLE_ACCESSIBILITY = True

ENABLE_AI_NOTES = True

ENABLE_ANALYTICS = True

ENABLE_NOTIFICATIONS = True

ENABLE_PERFORMANCE_LOGS = True

PIPELINE_TIMEOUT_MS = 5000

# ==========================================================
# Detection Filter Configuration
# ==========================================================

ENABLE_DUPLICATE_FILTER = True

IOU_THRESHOLD = 0.60

# ==========================================================
# Object Tracking Configuration
# ==========================================================

ENABLE_OBJECT_TRACKING = True

TRACKING_DISTANCE_THRESHOLD = 80

TRACK_EXPIRY_FRAMES = 15

TRACK_HISTORY_LENGTH = 20

MIN_TRACK_CONFIDENCE = 0.40

# ==========================================================
# Scene Analysis
# ==========================================================

ENABLE_SCENE_CHANGE_DETECTION = False

DISTANCE_NEAR = 1.0

DISTANCE_MEDIUM = 3.0

DISTANCE_FAR = 6.0

# ==========================================================
# Accessibility
# ==========================================================

ENABLE_CLASS_STABILIZATION = True

ENABLE_EVENT_LOGGING = True

ENABLE_VOICE_ASSISTANT = True

ENABLE_SMART_ANNOUNCEMENTS = True

# ==========================================================
# Debug Configuration
# ==========================================================

DEBUG_MODE = False

SAVE_DEBUG_IMAGES = False

PRINT_DETECTIONS = False

PRINT_OCR_RESULT = False

PRINT_PIPELINE_TIME = True

LOG_INFERENCE_TIME = True

SAVE_FAILED_FRAMES = False

# ==========================================================
# Performance Configuration
# ==========================================================

MAX_PIPELINE_FPS = 10

FRAME_QUEUE_SIZE = 5

CACHE_RESULTS = True

ENABLE_FRAME_SKIP = True

# ==========================================================
# Future AI Features
# ==========================================================

ENABLE_TEMPORAL_TRACKING = True

ENABLE_TTC_ESTIMATION = False

ENABLE_OBJECT_REIDENTIFICATION = False

ENABLE_BEHAVIOR_ANALYSIS = False

ENABLE_OCCUPANCY_ANALYTICS = True

ENABLE_CLASSROOM_STATISTICS = True

ENABLE_AUTO_SUMMARY = True

# Object Tracking

TRACKING_DISTANCE_THRESHOLD = 80

TRACK_EXPIRY_FRAMES = 15

# Class Stabilization

ENABLE_CLASS_STABILIZATION = True

CLASS_HISTORY_SIZE = 8

CLASS_STABILITY_THRESHOLD = 0.60

# OCR change detection
OCR_CHANGE_THRESHOLD = 0.90