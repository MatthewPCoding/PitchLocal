import httpx
from app.core.config import settings

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"

# Chains that freelancers can't pitch — filtered from all search results.
CHAIN_BLACKLIST: frozenset[str] = frozenset({
    # Fast food — US
    "mcdonald's", "burger king", "wendy's", "taco bell", "chick-fil-a",
    "popeyes", "kfc", "kfc (kentucky fried chicken)", "sonic", "sonic drive-in",
    "arby's", "jack in the box", "whataburger", "hardee's", "carl's jr",
    "carl's jr.", "in-n-out", "in-n-out burger", "five guys", "shake shack",
    "wingstop", "raising cane's", "raising cane's chicken fingers",
    "zaxby's", "bojangles", "church's chicken",
    # Pizza
    "pizza hut", "domino's", "domino's pizza", "papa john's", "papa john's pizza",
    "little caesars", "little caesars pizza",
    # Casual dining — US
    "chipotle", "chipotle mexican grill", "panera", "panera bread",
    "olive garden", "applebee's", "ihop", "denny's", "red lobster",
    "outback", "outback steakhouse", "cheesecake factory", "the cheesecake factory",
    "buffalo wild wings", "hooters", "cracker barrel", "cracker barrel old country store",
    "longhorn steakhouse", "texas roadhouse", "chili's", "ruby tuesday",
    "red robin", "bob evans", "waffle house", "golden corral",
    # Coffee / bakery
    "starbucks", "dunkin", "dunkin'", "dunkin donuts", "dunkin' donuts",
    "mcdonald's mccafé", "costa coffee", "tim hortons",
    # Convenience / dollar
    "7-eleven", "7-11", "circle k", "wawa", "sheetz",
    "dollar tree", "dollar general", "family dollar", "five below",
    # Grocery / big box — US
    "walmart", "walmart supercenter", "target", "costco", "costco wholesale",
    "sam's club", "bj's", "bj's wholesale club",
    "kroger", "safeway", "publix", "albertsons", "whole foods",
    "whole foods market", "trader joe's", "aldi", "lidl",
    "food lion", "stop & shop", "giant", "h-e-b", "meijer",
    # Pharmacy — US
    "walgreens", "cvs", "cvs pharmacy", "rite aid",
    # Pharmacy / health — UK
    "boots",
    # Fast food / casual — UK & Europe
    "greggs", "pret a manger", "pret", "nando's", "wagamama",
    # Grocery — UK & Europe
    "sainsbury's", "tesco", "tesco express", "tesco metro",
    "lidl", "aldi", "asda", "morrisons", "waitrose",
    # Retail — global
    "h&m", "zara", "ikea", "uniqlo", "gap", "old navy", "banana republic",
    "forever 21", "urban outfitters", "american eagle", "hollister",
    "abercrombie & fitch", "victoria's secret", "bath & body works",
    # Home improvement / electronics / auto
    "home depot", "the home depot", "lowe's", "menards",
    "best buy", "autozone", "o'reilly", "o'reilly auto parts",
    "advance auto", "advance auto parts", "pep boys", "jiffy lube",
    "midas", "firestone", "firestone complete auto care",
    # Pharmacy / beauty chains
    "ulta", "ulta beauty", "sephora",
    # Sandwich / subs
    "subway",
})


def _is_chain(name: str) -> bool:
    return name.strip().lower() in CHAIN_BLACKLIST


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
        name = place.get("name", "")
        if _is_chain(name):
            continue
        results.append({
            "google_place_id": place.get("place_id"),
            "name": name,
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
    # Include way + relation so businesses mapped as buildings show up too
    query = f"""
[out:json][timeout:25];
(
  node["amenity"]["name"](around:{radius_m},{lat},{lng});
  node["shop"]["name"](around:{radius_m},{lat},{lng});
  node["tourism"]["name"](around:{radius_m},{lat},{lng});
  node["leisure"]["name"](around:{radius_m},{lat},{lng});
  node["office"]["name"](around:{radius_m},{lat},{lng});
  way["amenity"]["name"](around:{radius_m},{lat},{lng});
  way["shop"]["name"](around:{radius_m},{lat},{lng});
  way["tourism"]["name"](around:{radius_m},{lat},{lng});
  way["office"]["name"](around:{radius_m},{lat},{lng});
  relation["amenity"]["name"](around:{radius_m},{lat},{lng});
);
out center body 60;
"""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
            )
            data = resp.json()
    except Exception:
        return []

    kw = keyword.lower() if keyword else ""
    results = []
    seen: set[str] = set()
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "")
        if not name or _is_chain(name):
            continue
        # Deduplicate by name+address in case node+way both appear
        dedup_key = name.lower()
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        category = (
            tags.get("amenity") or tags.get("shop") or tags.get("tourism")
            or tags.get("leisure") or tags.get("office") or ""
        )
        if kw and kw not in name.lower() and kw not in category.lower():
            continue
        housenumber = tags.get("addr:housenumber", "")
        street      = tags.get("addr:street", "")
        address     = f"{housenumber} {street}".strip() if housenumber or street else ""

        # way/relation use a "center" object; node has lat/lon directly
        center = el.get("center", {})
        lat_val = el.get("lat") or center.get("lat")
        lng_val = el.get("lon") or center.get("lon")
        if lat_val is None or lng_val is None:
            continue

        results.append({
            "google_place_id": f"osm_{el['id']}",
            "name": name,
            "category": category,
            "address": address,
            "city":  tags.get("addr:city", ""),
            "state": tags.get("addr:state", ""),
            "lat":   lat_val,
            "lng":   lng_val,
            "phone":   tags.get("phone") or tags.get("contact:phone"),
            "email":   tags.get("email") or tags.get("contact:email"),
            "website": tags.get("website") or tags.get("contact:website"),
        })
    return results[:50]


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
