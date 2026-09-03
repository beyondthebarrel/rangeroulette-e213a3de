const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS = 80_000; // ~50 miles

export interface NearbyRange {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMiles: number;
  address?: string;
}

export function getUserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Public/civilian shooting ranges near a point, via OpenStreetMap's free
 * Overpass API (no key, no billing — unlike Google Places). Matches the
 * `leisure=shooting_range` tag, the standard OSM tag for gun ranges.
 */
export async function findNearbyRanges(lat: number, lon: number): Promise<NearbyRange[]> {
  // `leisure=shooting_range` is the "official" OSM tag, but in practice a lot
  // of real ranges (verified against actual public facilities) are instead
  // tagged `sport=shooting` on a `leisure=sports_centre` or similar — a
  // query for `leisure=shooting_range` alone misses most of them.
  const around = `around:${SEARCH_RADIUS_METERS},${lat},${lon}`;
  const query = `[out:json][timeout:25];
(
  node["leisure"="shooting_range"](${around});
  way["leisure"="shooting_range"](${around});
  relation["leisure"="shooting_range"](${around});
  node["sport"="shooting"](${around});
  way["sport"="shooting"](${around});
  relation["sport"="shooting"](${around});
);
out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Overpass API returned ${res.status}`);
  const data: { elements: OverpassElement[] } = await res.json();

  const results: NearbyRange[] = [];
  for (const el of data.elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat == null || elLon == null) continue;
    const tags = el.tags ?? {};
    const addressParts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:state"]]
      .filter(Boolean)
      .join(" ");
    results.push({
      id: `${el.type}/${el.id}`,
      name: tags.name || "Unnamed Shooting Range",
      lat: elLat,
      lon: elLon,
      distanceMiles: haversineMiles(lat, lon, elLat, elLon),
      address: addressParts || undefined,
    });
  }

  return results.sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export function directionsUrl(range: NearbyRange): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${range.lat},${range.lon}`;
}
