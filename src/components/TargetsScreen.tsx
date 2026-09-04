import { HeroBackdrop } from "./HeroBackdrop";
import { DownloadIcon, PrinterIcon } from "./icons";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

interface PrintableTarget {
  id: string;
  name: string;
  description: string;
}

const TARGETS: PrintableTarget[] = [
  {
    id: "uspsa-a-zone",
    name: "A-Zone Silhouette",
    description: "Body silhouette with A/C/D scoring zones — matches the A-Zone drill cards.",
  },
  {
    id: "uspsa-head-box",
    name: "Head Box",
    description: "Head-and-shoulders silhouette with a marked head box — matches the Head Box drill cards.",
  },
  {
    id: "failure-drill",
    name: "Failure Drill",
    description: "Body A-zone plus head box on one sheet — 2 to the body, 1 to the head.",
  },
  {
    id: "precision-bullseye",
    name: "Precision Bullseye",
    description: "Classic ringed bullseye for zeroing and group practice.",
  },
];

function targetUrl(id: string): string {
  return `/targets/${id}.svg`;
}

export function TargetsScreen({ onBack }: { onBack: () => void }) {
  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Print Targets
          </h1>
          <p className="text-center text-sm text-zinc-400">
            Reduced-scale 8.5"×11" targets for dry-fire and close-range practice. Print at 100%
            ("Actual Size" — no "fit to page") for consistent scoring zone sizes.
          </p>
        </TitleFrame>

        {TARGETS.map((target) => (
          <Panel key={target.id}>
            <div className="flex gap-3">
              <a
                href={targetUrl(target.id)}
                target="_blank"
                rel="noreferrer"
                className="block h-32 w-24 shrink-0 overflow-hidden rounded border border-zinc-700 bg-white"
              >
                <img
                  src={targetUrl(target.id)}
                  alt={target.name}
                  className="h-full w-full object-contain"
                />
              </a>
              <div className="flex flex-1 flex-col gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{target.name}</div>
                  <div className="text-xs text-zinc-500">{target.description}</div>
                </div>
                <div className="mt-auto flex gap-2">
                  <a
                    href={targetUrl(target.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded border border-orange-700 px-3 py-1.5 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
                  >
                    <PrinterIcon className="h-3.5 w-3.5" />
                    Open &amp; Print
                  </a>
                  <a
                    href={targetUrl(target.id)}
                    download
                    className="flex items-center gap-1.5 rounded border border-zinc-600 px-3 py-1.5 text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </Panel>
        ))}

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
