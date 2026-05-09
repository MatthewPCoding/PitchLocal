import httpx
from app.core.config import settings

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"

async def search_nearby_businesses(
    lat: float,
    lng: float,
    radius_miles: float,
    category: str = "",
    keyword: str = ""
) -> list[dict]:
    """Search Google Places API for local businesses."""
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

async def get_place_details(place_id: str) -> dict:
    """Get detailed info including phone and website."""
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
