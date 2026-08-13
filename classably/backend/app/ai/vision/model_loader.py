class ModelLoader:

    def __init__(self):
        self.model = None
        self._available = None

    def get(self):
        if self.model is not None:
            return self.model

        if self._available is False:
            raise RuntimeError(
                "YOLO model is unavailable because Ultralytics/Torch failed to load."
            )

        try:
            from ultralytics import YOLO
        except Exception as exc:
            self._available = False
            raise RuntimeError(
                "Unable to import Ultralytics YOLO. "
                "Ensure the Torch/Ultralytics dependencies are installed and compatible."
            ) from exc

        self.model = YOLO("models/yolo11n.pt")
        self._available = True
        return self.model


loader = ModelLoader()