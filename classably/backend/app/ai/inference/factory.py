from app.ai.inference.detector import ObjectDetector
from app.ai.inference.tracker import ObjectTracker
from app.ai.inference.ocr import OCRProcessor
from app.ai.inference.activity import ActivityRecognizer
from app.ai.inference.collision import CollisionPredictor
from app.ai.inference.navigation import NavigationEngine


class AIComponents:

    detector = ObjectDetector()

    tracker = ObjectTracker()

    ocr = OCRProcessor()

    activity = ActivityRecognizer()

    collision = CollisionPredictor()

    navigation = NavigationEngine()


components = AIComponents()