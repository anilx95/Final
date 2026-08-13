from collections import deque
from threading import Lock


class FrameBuffer:

    def __init__(self, max_size=2):

        self.frames = deque(maxlen=max_size)

        self.lock = Lock()

    def push(self, frame):

        with self.lock:

            self.frames.append(frame)

    def latest(self):

        with self.lock:

            if not self.frames:

                return None

            return self.frames.pop()