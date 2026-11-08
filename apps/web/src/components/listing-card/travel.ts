const KM = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** A scooter does about 3 minutes per km in town; never less than 1 minute. */
export function travelMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm * 3));
}

/** "1,2" style kilometres (Vietnamese decimal comma, one decimal). */
export function formatKm(distanceKm: number): string {
  return KM.format(distanceKm);
}
