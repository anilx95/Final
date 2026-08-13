import cv2


class OCRPreprocessor:

    def process(self, image):
        """
        Preprocess image for better OCR accuracy.
        """

        # Scale image for improved text recognition
        image = cv2.resize(
            image,
            None,
            fx=2.0,
            fy=2.0,
            interpolation=cv2.INTER_CUBIC,
        )

        # Convert to grayscale
        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        # Reduce noise while preserving edges
        gray = cv2.bilateralFilter(
            gray,
            9,
            75,
            75,
        )

        # Improve local contrast
        clahe = cv2.createCLAHE(
            clipLimit=2.0,
            tileGridSize=(8, 8),
        )

        gray = clahe.apply(gray)

        # Adaptive threshold
        processed = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            10,
        )

        # Remove tiny noise
        kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT,
            (2, 2),
        )

        processed = cv2.morphologyEx(
            processed,
            cv2.MORPH_OPEN,
            kernel,
        )

        # Save debug image
        cv2.imwrite(
            "debug_ocr_processed.jpg",
            processed,
        )

        return processed


ocr_preprocessor = OCRPreprocessor()