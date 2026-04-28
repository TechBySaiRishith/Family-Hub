const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  userLat: number,
  userLng: number
): (T & { distance: number })[] {
  return items
    .map((item) => ({
      ...item,
      distance: haversineDistance(userLat, userLng, item.latitude, item.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);
}
