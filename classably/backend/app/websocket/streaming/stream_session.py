from app.websocket.streaming.frame_buffer import FrameBuffer


class StreamSession:

    def __init__(self):

        self.buffer = FrameBuffer()

        self.classroom_id = None

        self.running = True