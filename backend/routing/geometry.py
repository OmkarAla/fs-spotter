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
