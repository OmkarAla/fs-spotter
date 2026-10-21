import math


EARTH_RADIUS_MILES = 3958.8


def distance_miles(start, end):
    start_latitude, start_longitude = map(math.radians, start)
    end_latitude, end_longitude = map(math.radians, end)
    latitude_delta = end_latitude - start_latitude
    longitude_delta = end_longitude - start_longitude

    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start_latitude)
        * math.cos(end_latitude)
        * math.sin(longitude_delta / 2) ** 2
    )
    return EARTH_RADIUS_MILES * 2 * math.asin(math.sqrt(value))


def polyline_length_miles(points):
    return sum(
        distance_miles(start, end)
        for start, end in zip(points, points[1:])
    )


def point_at_distance(points, target_distance):
    if not points:
        raise ValueError("A polyline needs at least one point")
    if len(points) == 1 or target_distance <= 0:
        return points[0]

    traversed = 0.0
    for start, end in zip(points, points[1:]):
        segment_length = distance_miles(start, end)
        if target_distance <= traversed + segment_length:
            fraction = (
                (target_distance - traversed) / segment_length
                if segment_length
                else 0.0
            )
            return (
                start[0] + (end[0] - start[0]) * fraction,
                start[1] + (end[1] - start[1]) * fraction,
            )
        traversed += segment_length

    return points[-1]


def simplify_polyline(points, tolerance=0.0002):
    if len(points) < 3:
        return list(points)

    keep = [False] * len(points)
    keep[0] = True
    keep[-1] = True
    stack = [(0, len(points) - 1)]

    while stack:
        start, end = stack.pop()
        if end <= start + 1:
            continue

        ax, ay = points[start]
        bx, by = points[end]
        dx = bx - ax
        dy = by - ay
        denominator = dx * dx + dy * dy
        max_distance = -1.0
        max_index = -1

        for index in range(start + 1, end):
            px, py = points[index]
            if denominator == 0:
                distance = math.hypot(px - ax, py - ay)
            else:
                projection = max(
                    0.0,
                    min(1.0, ((px - ax) * dx + (py - ay) * dy) / denominator),
                )
                qx = ax + projection * dx
                qy = ay + projection * dy
                distance = math.hypot(px - qx, py - qy)

            if distance > max_distance:
                max_distance = distance
                max_index = index

        if max_distance > tolerance:
            keep[max_index] = True
            stack.append((start, max_index))
            stack.append((max_index, end))

    return [point for point, retained in zip(points, keep) if retained]


def decode_polyline(encoded):
    points = []
    index = 0
    latitude = 0
    longitude = 0

    while index < len(encoded):
        latitude_delta, index = _decode_value(encoded, index)
        longitude_delta, index = _decode_value(encoded, index)

        latitude += latitude_delta
        longitude += longitude_delta
        points.append((latitude / 1e5, longitude / 1e5))

    return points


def encode_polyline(points):
    encoded = []
    previous_latitude = 0
    previous_longitude = 0

    for latitude, longitude in points:
        latitude_value = int(round(latitude * 1e5))
        longitude_value = int(round(longitude * 1e5))

        for delta in (
            latitude_value - previous_latitude,
            longitude_value - previous_longitude,
        ):
            encoded.append(_encode_value(delta))

        previous_latitude = latitude_value
        previous_longitude = longitude_value

    return "".join(encoded)


def _decode_value(encoded, index):
    result = 0
    shift = 0

    while True:
        value = ord(encoded[index]) - 63
        index += 1
        result |= (value & 0x1F) << shift
        shift += 5

        if value < 0x20:
            break

    if result & 1:
        result = ~(result >> 1)
    else:
        result >>= 1

    return result, index


def _encode_value(value):
    value = ~(value << 1) if value < 0 else value << 1
    encoded = []

    while value >= 0x20:
        encoded.append(chr((0x20 | (value & 0x1F)) + 63))
        value >>= 5

    encoded.append(chr(value + 63))
    return "".join(encoded)
