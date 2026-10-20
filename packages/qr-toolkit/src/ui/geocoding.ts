import * as v from "valibot";

export interface QrLocationSearchResult {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
}
export type QrLocationSearch = (
  query: string,
  options: { signal: AbortSignal },
) => Promise<readonly QrLocationSearchResult[]>;

const ResultSchema = v.object({
  features: v.array(
    v.object({
      geometry: v.object({
        type: v.literal("Point"),
        coordinates: v.tuple([
          v.pipe(v.number(), v.finite(), v.minValue(-180), v.maxValue(180)),
          v.pipe(v.number(), v.finite(), v.minValue(-90), v.maxValue(90)),
        ]),
      }),
      properties: v.record(v.string(), v.unknown()),
    }),
  ),
});
const cache = new Map<string, { time: number; results: readonly QrLocationSearchResult[] }>();
let nextRequestAt = 0;

/** Photon public API: explicit searches only, bounded cache and at most one start per second. */
export const searchQrLocations: QrLocationSearch = async (query, { signal }) => {
  const key = query.trim();
  if (!key) return [];
  const cached = cache.get(key.toLocaleLowerCase());
  if (cached && Date.now() - cached.time < 600000) return cached.results;
  const delay = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Date.now() + delay + 1000;
  if (delay) {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, delay);
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
  }
  signal.throwIfAborted();
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", key);
  url.searchParams.set("limit", "5");
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok) throw new Error("LOCATION_SEARCH_FAILED");
  const parsed = v.safeParse(ResultSchema, await response.json());
  if (!parsed.success) throw new Error("LOCATION_SEARCH_FAILED");
  const results = parsed.output.features.map(({ geometry, properties }, index) => {
    const parts = [
      properties.name,
      [properties.street, properties.housenumber]
        .filter((part) => typeof part === "string")
        .join(" "),
      properties.city,
      properties.state,
      properties.country,
    ].filter((part): part is string => typeof part === "string" && !!part);
    return {
      id: `${String(properties.osm_type)}-${String(properties.osm_id)}-${index}`,
      label: [...new Set(parts)].join(", ") || geometry.coordinates.join(", "),
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
    };
  });
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key.toLocaleLowerCase(), { time: Date.now(), results });
  return results;
};
