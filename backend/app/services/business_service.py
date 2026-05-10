import httpx
from app.core.config import settings

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"


async def search_nearby_businesses(
    lat: float,
    lng: float,
    radius_miles: float,
    category: str = "",
    keyword: str = "",
) -> list[dict]:
    if settings.GOOGLE_PLACES_API_KEY:
        return await _google_nearby(lat, lng, radius_miles, category, keyword)
    return await _overpass_nearby(lat, lng, radius_miles, keyword)


async def _google_nearby(lat, lng, radius_miles, category, keyword):
    radius_meters = int(radius_miles * 1609.34)
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_meters,
        "key": settings.GOOGLE_PLACES_API_KEY,
    }
    if category:
        params["type"] = category
    if keyword:
        params["keyword"] = keyword

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
        data = response.json()

    results = []
    for place in data.get("results", []):
        results.append({
            "google_place_id": place.get("place_id"),
            "name": place.get("name"),
            "category": ", ".join(place.get("types", [])),
            "address": place.get("vicinity"),
            "lat": place["geometry"]["location"]["lat"],
            "lng": place["geometry"]["location"]["lng"],
            "rating": place.get("rating"),
            "review_count": place.get("user_ratings_total"),
        })
    return results


async def _overpass_nearby(lat, lng, radius_miles, keyword):
    # Cap at 8 km to avoid Overpass timeout
    radius_m = min(int(radius_miles * 1609.34), 8000)
    query = f"""
[out:json][timeout:15];
(
  node["amenity"]["name"](around:{radius_m},{lat},{lng});
  node["shop"]["name"](around:{radius_m},{lat},{lng});
);
out body 40;
"""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
            )
            data = resp.json()
    except Exception:
        return []

    kw = keyword.lower() if keyword else ""
    results = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "")
        if not name:
            continue
        category = tags.get("amenity") or tags.get("shop") or ""
        if kw and kw not in name.lower() and kw not in category.lower():
            continue
        housenumber = tags.get("addr:housenumber", "")
        street      = tags.get("addr:street", "")
        address     = f"{housenumber} {street}".strip() if housenumber or street else ""
        results.append({
            "google_place_id": f"osm_{el['id']}",
            "name": name,
            "category": category,
            "address": address,
            "city":  tags.get("addr:city", ""),
            "state": tags.get("addr:state", ""),
            "lat":   el.get("lat"),
            "lng":   el.get("lon"),
            "phone":   tags.get("phone") or tags.get("contact:phone"),
            "email":   tags.get("email") or tags.get("contact:email"),
            "website": tags.get("website") or tags.get("contact:website"),
        })
    return results[:30]


async def get_place_details(place_id: str) -> dict:
    if not settings.GOOGLE_PLACES_API_KEY:
        return {}
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website,formatted_address,editorial_summary",
        "key": settings.GOOGLE_PLACES_API_KEY,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{PLACES_BASE}/details/json", params=params)
        data = response.json()

    result = data.get("result", {})
    return {
        "phone": result.get("formatted_phone_number"),
        "website": result.get("website"),
        "address": result.get("formatted_address"),
        "description": result.get("editorial_summary", {}).get("overview"),
    }
