import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  deleteSavedStage,
  listSavedStages,
  loadCurrentLayout,
  saveCurrentLayout,
  saveNamedStage,
} from "../stageBuilder/storage";
import {
  BASE_SIZE_FT,
  BAY_DEPTH_FT,
  BAY_WIDTH_FT,
  createProp,
  makePropId,
  PROP_DEFS,
  PX_PER_FT,
  RECTANGULAR_TYPES,
  type PropType,
  type SavedStage,
  type StageProp,
} from "../stageBuilder/types";
import { BackLink } from "./BackLink";
import { HeroBackdrop } from "./HeroBackdrop";
import { Panel } from "./Panel";
import { TitleFrame } from "./TitleFrame";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Icon shapes modeled on the actual figures in USPSA's own stage-diagram
// PDFs — a flat-shouldered cardboard silhouette with a rounded head bump and
// a bold X brace for paper targets, a taller round-headed silhouette (no
// brace) for steel poppers — redrawn from scratch as colored props for this
// tool rather than traced/copied line-for-line from any one diagram.
const INK = "#18181b";

function targetSilhouette(w: number, h: number) {
  const shoulderY = -h * 0.28;
  const headR = w * 0.24;
  return `M${-w / 2},${h / 2} L${-w / 2},${shoulderY} L${-headR},${shoulderY} A${headR},${headR} 0 0 1 ${headR},${shoulderY} L${w / 2},${shoulderY} L${w / 2},${h / 2} Z`;
}

function popperSilhouette(w: number, h: number) {
  const shoulderY = -h * 0.15;
  const shoulderHalf = w * 0.3;
  const headR = w * 0.3;
  return `M${-w / 2},${h / 2} L${-shoulderHalf},${shoulderY} L${-headR},${shoulderY} A${headR},${headR} 0 0 1 ${headR},${shoulderY} L${shoulderHalf},${shoulderY} L${w / 2},${h / 2} Z`;
}

function shapeFor(type: PropType, w: number, h: number) {
  switch (type) {
    case "paperTarget": {
      const shoulderY = -h * 0.28;
      return (
        <>
          <path d={targetSilhouette(w, h)} fill="#d9b98a" stroke="#6b4a2f" strokeWidth={1.1} />
          <line x1={-w / 2} y1={shoulderY} x2={w / 2} y2={h / 2} stroke="#3f2f1f" strokeWidth={1.5} />
          <line x1={w / 2} y1={shoulderY} x2={-w / 2} y2={h / 2} stroke="#3f2f1f" strokeWidth={1.5} />
        </>
      );
    }
    case "noShoot":
      return (
        <>
          <path d={targetSilhouette(w, h)} fill="#fafafa" stroke={INK} strokeWidth={1.1} />
          <line x1={-w * 0.3} y1={-h * 0.22} x2={w * 0.3} y2={h * 0.4} stroke="#dc2626" strokeWidth={1.5} />
          <line x1={w * 0.3} y1={-h * 0.22} x2={-w * 0.3} y2={h * 0.4} stroke="#dc2626" strokeWidth={1.5} />
        </>
      );
    case "steelPopper":
      return <path d={popperSilhouette(w, h)} fill="#a1a1aa" stroke="#3f3f46" strokeWidth={1.1} />;
    case "hardcover": {
      const hatches = [];
      const step = w / 5;
      for (let i = -2; i <= 2; i += 1) {
        hatches.push(
          <line
            key={i}
            x1={i * step - h / 2}
            y1={-h / 2}
            x2={i * step + h / 2}
            y2={h / 2}
            stroke="#0a0a0a"
            strokeWidth={0.5}
          />,
        );
      }
      return (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#52525b" stroke="#18181b" strokeWidth={1} />
          {hatches}
        </>
      );
    }
    case "wall":
      return (
        <>
          <polygon
            points={`${-w / 2},${h / 2} ${w / 2},${h / 2} ${w * 0.42},${-h / 2} ${-w * 0.42},${-h / 2}`}
            fill="#b08968"
            stroke="#5c4130"
            strokeWidth={1}
          />
          <line x1={-w * 0.35} y1={0} x2={w * 0.35} y2={0} stroke="#5c4130" strokeWidth={0.5} strokeDasharray="1.5 1.5" />
        </>
      );
    case "faultLine":
      return (
        <>
          <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#dc2626" strokeWidth={2} />
          <line x1={-w / 2} y1={-3} x2={-w / 2} y2={3} stroke={INK} strokeWidth={0.75} />
          <line x1={w / 2} y1={-3} x2={w / 2} y2={3} stroke={INK} strokeWidth={0.75} />
        </>
      );
    case "shootingBox":
      return (
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          fill="rgba(249,115,22,0.18)"
          stroke="#f97316"
          strokeWidth={1.25}
        />
      );
    case "barrel":
      return (
        <>
          <circle cx={0} cy={0} r={w / 2} fill="#2563eb" stroke="#1e3a8a" strokeWidth={1.1} />
          <circle cx={0} cy={0} r={w * 0.32} fill="none" stroke="#bfdbfe" strokeWidth={0.9} />
        </>
      );
    default:
      return null;
  }
}

function PropSwatch({ type }: { type: PropType }) {
  const base = BASE_SIZE_FT[type];
  const w = base.w * PX_PER_FT;
  const h = base.h * PX_PER_FT;
  const pad = 4;
  const half = Math.max(w, h) / 2 + pad;
  return (
    <svg viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} className="h-7 w-7 shrink-0">
      {shapeFor(type, w, h)}
    </svg>
  );
}

function PropIcon({
  prop,
  selected,
  pointToFt,
  onSelect,
  onMove,
}: {
  prop: StageProp;
  selected: boolean;
  pointToFt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const offsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const base = BASE_SIZE_FT[prop.type];
  const w = base.w * PX_PER_FT;
  const h = base.h * PX_PER_FT;
  const cx = prop.x * PX_PER_FT;
  const cy = prop.y * PX_PER_FT;

  function handleDown(e: React.PointerEvent<SVGGElement>) {
    e.stopPropagation();
    onSelect(prop.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = pointToFt(e.clientX, e.clientY);
    offsetRef.current = start ? { dx: start.x - prop.x, dy: start.y - prop.y } : { dx: 0, dy: 0 };
  }

  function handleMove(e: React.PointerEvent<SVGGElement>) {
    const offset = offsetRef.current;
    if (!offset) return;
    const pt = pointToFt(e.clientX, e.clientY);
    if (!pt) return;
    onMove(prop.id, clamp(pt.x - offset.dx, 0, BAY_WIDTH_FT), clamp(pt.y - offset.dy, 0, BAY_DEPTH_FT));
  }

  function handleUp(e: React.PointerEvent<SVGGElement>) {
    offsetRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const showLabelInside = prop.type === "shootingBox";
  const labelDy = showLabelInside ? 0 : h / 2 + 10;

  return (
    <g>
      <g
        transform={`translate(${cx} ${cy}) rotate(${prop.rotation}) scale(${prop.scaleX} ${prop.scaleY})`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        style={{ cursor: "grab", touchAction: "none" }}
      >
        {shapeFor(prop.type, w, h)}
        {selected && (
          <rect
            x={-w / 2 - 4}
            y={-h / 2 - 4}
            width={w + 8}
            height={h + 8}
            fill="none"
            stroke="#fb923c"
            strokeWidth={1.25}
            strokeDasharray="3 2"
          />
        )}
      </g>
      {prop.label && (
        <text
          x={cx}
          y={cy + labelDy}
          textAnchor="middle"
          dominantBaseline={showLabelInside ? "middle" : "hanging"}
          fontSize={9}
          fontWeight={700}
          fill={selected ? "#ea580c" : "#18181b"}
          className="font-mono"
          style={{ pointerEvents: "none" }}
        >
          {prop.label}
        </text>
      )}
    </g>
  );
}

export function StageBuilderScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const svgRef = useRef<SVGSVGElement>(null);

  const [props, setProps] = useState<StageProp[]>(() => loadCurrentLayout(userId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedStage[]>(() => listSavedStages(userId));
  const [saveName, setSaveName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    saveCurrentLayout(userId, props);
  }, [userId, props]);

  const selected = props.find((p) => p.id === selectedId) ?? null;

  function pointToFt(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x / PX_PER_FT, y: loc.y / PX_PER_FT };
  }

  function addProp(type: PropType) {
    const count = props.length;
    const x = clamp(BAY_WIDTH_FT / 2 + ((count % 5) - 2) * 4, 2, BAY_WIDTH_FT - 2);
    const y = clamp(BAY_DEPTH_FT / 2 + ((Math.floor(count / 5) % 4) - 1.5) * 4, 2, BAY_DEPTH_FT - 2);
    const prop = createProp(type, props, x, y);
    setProps((prev) => [...prev, prop]);
    setSelectedId(prop.id);
  }

  function updateSelected(patch: Partial<StageProp>) {
    if (!selectedId) return;
    setProps((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)));
  }

  function moveProp(id: string, x: number, y: number) {
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setProps((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: StageProp = {
      ...selected,
      id: makePropId(),
      x: clamp(selected.x + 3, 1, BAY_WIDTH_FT - 1),
      y: clamp(selected.y + 3, 1, BAY_DEPTH_FT - 1),
    };
    setProps((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function rotateSelected(delta: number) {
    if (!selected) return;
    const next = ((selected.rotation + delta) % 360 + 360) % 360;
    updateSelected({ rotation: next });
  }

  function resizeSelected(axis: "x" | "y" | "both", delta: number) {
    if (!selected) return;
    if (axis === "both") {
      const s = clamp(selected.scaleX + delta, 0.4, 4);
      updateSelected({ scaleX: s, scaleY: s });
    } else if (axis === "x") {
      updateSelected({ scaleX: clamp(selected.scaleX + delta, 0.25, 6) });
    } else {
      updateSelected({ scaleY: clamp(selected.scaleY + delta, 0.25, 6) });
    }
  }

  function handleClearAll() {
    setProps([]);
    setSelectedId(null);
    setConfirmClear(false);
  }

  function handleSave() {
    const name = saveName.trim() || `Untitled Stage ${saved.length + 1}`;
    const stage = saveNamedStage(userId, name, props);
    setSaved((prev) => [stage, ...prev]);
    setSaveName("");
  }

  function handleLoad(stage: SavedStage) {
    setProps(stage.props.map((p) => ({ ...p })));
    setSelectedId(null);
  }

  function handleDeleteSaved(id: string) {
    deleteSavedStage(userId, id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  const viewW = BAY_WIDTH_FT * PX_PER_FT;
  const viewH = BAY_DEPTH_FT * PX_PER_FT;
  const gridStepFt = 10;

  return (
    <HeroBackdrop>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TitleFrame>
          <BackLink onClick={onBack} label="Competition" />
          <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
            Build Your Own Stage
          </h1>
          <p className="text-center text-sm text-zinc-400">
            Tap a prop to add it, drag it into place on the range, then use the toolbar below to
            rotate, resize, label, or remove it.
          </p>
        </TitleFrame>

        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
            Add a Prop
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PROP_DEFS.map((def) => (
              <button
                key={def.type}
                onClick={() => addProp(def.type)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-300 bg-white p-2 hover:border-orange-600"
              >
                <PropSwatch type={def.type} />
                <span className="text-center text-[10px] leading-tight text-zinc-700">{def.name}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-500">
            <span>↑ Downrange</span>
            <span>Not to exact scale</span>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewW} ${viewH}`}
            className="w-full touch-none rounded-sm border-2 border-zinc-900 bg-white"
            style={{ touchAction: "none" }}
            onPointerDown={() => setSelectedId(null)}
          >
            {Array.from({ length: Math.floor(BAY_WIDTH_FT / gridStepFt) + 1 }, (_, i) => i * gridStepFt).map(
              (ft) => (
                <line
                  key={`v${ft}`}
                  x1={ft * PX_PER_FT}
                  y1={0}
                  x2={ft * PX_PER_FT}
                  y2={viewH}
                  stroke="#d4d4d8"
                  strokeWidth={0.5}
                />
              ),
            )}
            {Array.from({ length: Math.floor(BAY_DEPTH_FT / gridStepFt) + 1 }, (_, i) => i * gridStepFt).map(
              (ft) => (
                <line
                  key={`h${ft}`}
                  x1={0}
                  y1={ft * PX_PER_FT}
                  x2={viewW}
                  y2={ft * PX_PER_FT}
                  stroke="#d4d4d8"
                  strokeWidth={0.5}
                />
              ),
            )}
            <text x={6} y={13} fontSize={9} fill="#71717a" className="font-mono">
              {BAY_WIDTH_FT}×{BAY_DEPTH_FT} ft
            </text>
            {props.map((p) => (
              <PropIcon
                key={p.id}
                prop={p}
                selected={p.id === selectedId}
                pointToFt={pointToFt}
                onSelect={setSelectedId}
                onMove={moveProp}
              />
            ))}
          </svg>
          <div className="text-center text-[11px] uppercase tracking-wide text-zinc-500">
            ↓ Shooter Start
          </div>
        </Panel>

        {selected ? (
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Editing {PROP_DEFS.find((d) => d.type === selected.type)?.name}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Done
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-16 text-xs uppercase tracking-wide text-zinc-500">Label</span>
              <input
                value={selected.label}
                onChange={(e) => updateSelected({ label: e.target.value })}
                placeholder="(none)"
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Rotation</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rotateSelected(-15)}
                  className="h-8 w-8 rounded-md bg-orange-700 text-lg font-bold text-white hover:bg-orange-600"
                >
                  ⟲
                </button>
                <span className="w-12 text-center font-mono text-sm text-white">{selected.rotation}°</span>
                <button
                  onClick={() => rotateSelected(15)}
                  className="h-8 w-8 rounded-md bg-orange-700 text-lg font-bold text-white hover:bg-orange-600"
                >
                  ⟳
                </button>
              </div>
            </div>

            {RECTANGULAR_TYPES.has(selected.type) ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Length</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resizeSelected("x", -0.25)}
                      className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                    >
                      −
                    </button>
                    <span className="w-14 text-center font-mono text-sm text-white">
                      {(BASE_SIZE_FT[selected.type].w * selected.scaleX).toFixed(1)} ft
                    </span>
                    <button
                      onClick={() => resizeSelected("x", 0.25)}
                      className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Width</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resizeSelected("y", -0.25)}
                      className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                    >
                      −
                    </button>
                    <span className="w-14 text-center font-mono text-sm text-white">
                      {(BASE_SIZE_FT[selected.type].h * selected.scaleY).toFixed(1)} ft
                    </span>
                    <button
                      onClick={() => resizeSelected("y", 0.25)}
                      className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Size</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resizeSelected("both", -0.1)}
                    className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                  >
                    −
                  </button>
                  <span className="w-14 text-center font-mono text-sm text-white">
                    {(selected.scaleX * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => resizeSelected("both", 0.1)}
                    className="h-8 w-8 rounded-md bg-zinc-700 text-lg font-bold text-white hover:bg-zinc-600"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={duplicateSelected}
                className="flex-1 rounded-md border border-zinc-600 px-3 py-2 text-xs uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              >
                Duplicate
              </button>
              <button
                onClick={deleteSelected}
                className="flex-1 rounded-md border border-red-800 px-3 py-2 text-xs uppercase tracking-wide text-red-400 hover:bg-red-950"
              >
                Delete
              </button>
            </div>
          </Panel>
        ) : (
          props.length > 0 && (
            <p className="text-center text-xs text-zinc-500">Tap a prop on the range to edit it.</p>
          )
        )}

        <Panel>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              Save This Layout
            </div>
            {props.length > 0 &&
              (confirmClear ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-400">Clear the range?</span>
                  <button
                    onClick={handleClearAll}
                    className="rounded bg-orange-700 px-2 py-1 text-white hover:bg-orange-600"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded bg-zinc-700 px-2 py-1 text-white hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                >
                  Clear Range
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name this stage…"
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={props.length === 0}
              className="shrink-0 rounded-md bg-orange-700 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              💾 Save
            </button>
          </div>
          <p className="text-[11px] leading-snug text-zinc-500">
            Saved to this device only — layouts don't sync across phones or browsers yet. Your
            in-progress layout is kept automatically even if you leave this screen.
          </p>

          {saved.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
              {saved.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{s.name}</div>
                    <div className="text-xs text-zinc-500">
                      {s.props.length} prop{s.props.length === 1 ? "" : "s"} ·{" "}
                      {new Date(s.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {confirmDeleteId === s.id ? (
                      <>
                        <button
                          onClick={() => handleDeleteSaved(s.id)}
                          className="rounded bg-orange-700 px-2 py-1 text-xs text-white hover:bg-orange-600"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded bg-zinc-700 px-2 py-1 text-xs text-white hover:bg-zinc-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLoad(s)}
                          className="rounded border border-orange-700 px-2.5 py-1 text-xs uppercase tracking-wide text-orange-400 hover:bg-orange-950"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
                          aria-label="Delete saved stage"
                          title="Delete saved stage"
                          className="text-zinc-500 hover:text-orange-400"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
