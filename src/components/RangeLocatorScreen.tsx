import { useState } from "react";
import { directionsUrl, findNearbyRanges, getUserLocation, type NearbyRange } from "../rangeLocator";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

type Status = "idle" | "locating" | "searching" | "done" | "error";

export function RangeLocatorScreen({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ranges, setRanges] = useState<NearbyRange[]>([]);

  async function handleFind() {
    setError(null);
    setStatus("locating");
    let position: GeolocationPosition;
    try {
      position = await getUserLocation();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
          ? "Location access was denied — allow it in your browser's site settings to find ranges near you."
          : "Couldn't get your location. Check your device's location settings and try again.",
      );
      return;
    }

    setStatus("searching");
    try {
      const found = await findNearbyRanges(position.coords.latitude, position.coords.longitude);
      setRanges(found);
      setStatus("done");
    } catch (err) {
      console.error("Failed to search for nearby ranges", err);
      setStatus("error");
      setError("Couldn't reach the range database — check your connection and try again.");
    }
  }

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Find Ranges Near You
          </h1>
          <p className="text-center text-sm text-zinc-400">
            Public shooting ranges within about 50 miles, from OpenStreetMap's open range directory.
          </p>
        </TitleFrame>

        {status === "idle" && (
          <Panel>
            <button
              onClick={handleFind}
              className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
            >
              📍 Use My Location
            </button>
            <p className="text-center text-xs text-zinc-500">
              Your location is only used for this search — it isn't stored or sent anywhere else.
            </p>
          </Panel>
        )}

        {(status === "locating" || status === "searching") && (
          <Panel>
            <p className="text-center text-sm text-zinc-400">
              {status === "locating" ? "Getting your location…" : "Searching nearby ranges…"}
            </p>
          </Panel>
        )}

        {status === "error" && (
          <Panel>
            <p className="text-center text-sm text-amber-400">{error}</p>
            <button
              onClick={handleFind}
              className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
            >
              Try Again
            </button>
          </Panel>
        )}

        {status === "done" && (
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {ranges.length} Range{ranges.length === 1 ? "" : "s"} Found
              </div>
              <button
                onClick={handleFind}
                className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Refresh
              </button>
            </div>

            {ranges.length === 0 ? (
              <p className="text-center text-sm text-zinc-400">
                No mapped ranges found within 50 miles. Coverage depends on OpenStreetMap's data — a
                nearby range may just not be tagged there yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ranges.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3"
                  >
                    <div>
                      <div className="text-sm text-white">{r.name}</div>
                      {r.address && <div className="text-xs text-zinc-500">{r.address}</div>}
                      <div className="text-xs text-zinc-500">{r.distanceMiles.toFixed(1)} mi away</div>
                    </div>
                    <a
                      href={directionsUrl(r)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded border border-orange-700 px-3 py-1.5 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
                    >
                      Directions
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <button
          onClick={onBack}
          className="w-full rounded-md bg-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-orange-600"
        >
          Back
        </button>
      </div>
    </HeroBackdrop>
  );
}
