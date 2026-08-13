HIGH_PRIORITY = {
    "person",
    "car",
    "truck",
    "bus",
    "motorcycle",
    "bicycle",
}

LOW_PRIORITY = {
    "chair",
    "bench",
    "backpack",
    "bottle",
}


def obstacle_priority(label):

    if label in HIGH_PRIORITY:
        return 1

    if label in LOW_PRIORITY:
        return 2

    return 3