def get_direction(bbox, frame_width):

    x1, y1, x2, y2 = bbox

    center_x = (x1 + x2) / 2

    left_boundary = frame_width * 0.35
    right_boundary = frame_width * 0.65

    if center_x < left_boundary:
        return "left"

    if center_x > right_boundary:
        return "right"

    return "center"