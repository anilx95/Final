class DetectionPostProcessor:

    def process(self, results):

        detections = []

        for result in results:

            boxes = result.boxes

            for box in boxes:

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append({

                    "bbox": [x1, y1, x2, y2],

                    "confidence": float(box.conf),

                    "class_id": int(box.cls),

                    "label": result.names[int(box.cls)]

                })

        return detections


postprocessor = DetectionPostProcessor()