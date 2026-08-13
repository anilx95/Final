def collision_level(distance):

    if distance is None:
        return "unknown"

    if distance < 1:
        return "danger"

    if distance < 2:
        return "warning"

    return "safe"