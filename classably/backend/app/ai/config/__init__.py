"""
AI Configuration Module

Centralized configuration for the AI pipeline.
"""

from .thresholds import AIThresholds

# Tracking Configuration
TRACKING_DISTANCE_THRESHOLD = 60
TRACK_EXPIRY_FRAMES = 10

# Feature Flags
ENABLE_CLASS_STABILIZATION = True

# OCR Configuration
OCR_CHANGE_THRESHOLD = 0.95