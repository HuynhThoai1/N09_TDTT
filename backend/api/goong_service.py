import os
import requests

GOONG_BASE_URL = "https://rsapi.goong.io"

def get_api_key():
    key = os.getenv("GOONG_API_KEY", "").strip()
    if not key:
        print("[WARNING] GOONG_API_KEY not configured in .env!")
    return key


def decode_polyline(polyline_str):
    """
    Giải mã Google Encoded Polyline thành mảng tọa độ [[lat, lng], ...]
    Goong Directions API trả về polyline dạng encoded (giống Google Maps).
    """
    index, lat, lng = 0, 0, 0
    coordinates = []
    changes = {'latitude': 0, 'longitude': 0}

    while index < len(polyline_str):
        for unit in ['latitude', 'longitude']:
            shift, result = 0, 0
            while True:
                byte = ord(polyline_str[index]) - 63
                index += 1
                result |= (byte & 0x1f) << shift
                shift += 5
                if not byte >= 0x20:
                    break

            if (result & 1):
                changes[unit] = ~(result >> 1)
            else:
                changes[unit] = (result >> 1)

        lat += changes['latitude']
        lng += changes['longitude']
        coordinates.append([lat / 100000.0, lng / 100000.0])

    return coordinates


def goong_autocomplete(input_text, location=None, limit=10):
    """Gợi ý địa điểm từ khóa tìm kiếm (Goong Place AutoComplete)"""
    url = f"{GOONG_BASE_URL}/Place/AutoComplete"
    params = {
        "api_key": get_api_key(),
        "input": input_text,
        "limit": limit
    }
    if location:
        params["location"] = location
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        if "error" in data or "predictions" not in data:
            print(f"[Goong API Response] AutoComplete: {data}")
        return data
    except Exception as e:
        print(f"[Goong API Error] AutoComplete: {e}")
        return {"error": str(e)}


def goong_place_detail(place_id):
    """Lấy thông tin chi tiết địa điểm bằng place_id"""
    url = f"{GOONG_BASE_URL}/Place/Detail"
    params = {
        "api_key": get_api_key(),
        "place_id": place_id
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        return response.json()
    except Exception as e:
        print(f"[Goong API Error] Place Detail: {e}")
        return {"error": str(e)}


def goong_geocode(address):
    """Chuyển đổi địa chỉ thành tọa độ (Forward Geocoding)"""
    url = f"{GOONG_BASE_URL}/geocode"
    params = {
        "api_key": get_api_key(),
        "address": address
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        return response.json()
    except Exception as e:
        print(f"[Goong API Error] Geocode: {e}")
        return {"error": str(e)}


def goong_reverse_geocode(lat, lng):
    """Chuyển đổi tọa độ thành địa chỉ (Reverse Geocoding)"""
    url = f"{GOONG_BASE_URL}/Geocode"
    params = {
        "api_key": get_api_key(),
        "latlng": f"{lat},{lng}"
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        return response.json()
    except Exception as e:
        print(f"[Goong API Error] Reverse Geocode: {e}")
        return {"error": str(e)}


def goong_distance_matrix(origins, destinations, vehicle="car"):
    """
    Lấy ma trận thời gian và khoảng cách
    origins, destinations format: "lat,lng|lat,lng|..."
    """
    url = f"{GOONG_BASE_URL}/DistanceMatrix"
    params = {
        "api_key": get_api_key(),
        "origins": origins,
        "destinations": destinations,
        "vehicle": vehicle
    }
    try:
        response = requests.get(url, params=params, timeout=15)
        return response.json()
    except Exception as e:
        print(f"[Goong API Error] Distance Matrix: {e}")
        return {"error": str(e)}


def goong_directions(origin, destination, vehicle="car"):
    """
    Tìm đường đi giữa 2 điểm
    origin, destination format: "lat,lng"
    """
    url = f"{GOONG_BASE_URL}/Direction"
    params = {
        "api_key": get_api_key(),
        "origin": origin,
        "destination": destination,
        "vehicle": vehicle
    }
    try:
        response = requests.get(url, params=params, timeout=15)
        return response.json()
    except Exception as e:
        print(f"[Goong API Error] Direction: {e}")
        return {"error": str(e)}
