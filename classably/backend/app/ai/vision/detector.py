from app.ai.vision.model_loader import loader


class Detector:

    def predict(self, frame):

        model = loader.get()

        return model.predict(
            frame,
            conf=0.35,
            verbose=False,
        )


detector = Detector()