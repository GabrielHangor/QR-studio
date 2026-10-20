import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const feature = {
  geometry: { type: "Point", coordinates: [30.3, 59.9] },
  properties: { osm_type: "N", osm_id: 1, name: "Площадь", city: "Петербург", country: "Россия" },
};
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("place search", () => {
  it("validates results and caches repeated searches", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ features: [feature] })));
    vi.stubGlobal("fetch", fetch);
    const { searchQrLocations } = await import("../src/ui/geocoding.js");
    const options = { signal: new AbortController().signal };
    expect(await searchQrLocations(" Площадь ", options)).toEqual([
      { id: "N-1-0", label: "Площадь, Петербург, Россия", latitude: 59.9, longitude: 30.3 },
    ]);
    await searchQrLocations("площадь", options);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetch.mock.calls[0]![0])).searchParams.get("q")).toBe("Площадь");
  });
  it("spaces network requests by at least one second", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(new Response('{"features":[]}')));
    vi.stubGlobal("fetch", fetch);
    const { searchQrLocations } = await import("../src/ui/geocoding.js");
    const options = { signal: new AbortController().signal };
    await searchQrLocations("One", options);
    const second = searchQrLocations("Two", options);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("cancels a queued request without hitting the API", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(new Response('{"features":[]}')));
    vi.stubGlobal("fetch", fetch);
    const { searchQrLocations } = await import("../src/ui/geocoding.js");
    await searchQrLocations("One", { signal: new AbortController().signal });
    const controller = new AbortController();
    const second = searchQrLocations("Two", { signal: controller.signal });
    controller.abort();
    await expect(second).rejects.toBe(controller.signal.reason);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed or out-of-range results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            features: [{ ...feature, geometry: { type: "Point", coordinates: [30, 100] } }],
          }),
        ),
      ),
    );
    const { searchQrLocations } = await import("../src/ui/geocoding.js");
    await expect(
      searchQrLocations("Bad", { signal: new AbortController().signal }),
    ).rejects.toThrow("LOCATION_SEARCH_FAILED");
  });
});
