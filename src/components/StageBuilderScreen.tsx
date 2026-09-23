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
import { Stepper } from "./Stepper";
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
  // The standard USPSA/IPSC steel popper: a narrow base tapering up into a
  // wide round "shoulder" bulge, capped with a smaller round head bump.
  const stemHalf = w * 0.15;
  const bulgeHalf = w * 0.5;
  const headHalf = w * 0.22;
  const headR = w * 0.22;
  const baseY = h * 0.42;
  const torsoBottomY = h * 0.05;
  const torsoMidY = -h * 0.12;
  const torsoTopY = -h * 0.3;
  return `M${-stemHalf},${baseY} L${-stemHalf},${torsoBottomY} Q${-bulgeHalf},${torsoMidY} ${-headHalf},${torsoTopY} A${headR},${headR} 0 0 1 ${headHalf},${torsoTopY} Q${bulgeHalf},${torsoMidY} ${stemHalf},${torsoBottomY} L${stemHalf},${baseY} Z`;
}

function shapeFor(type: PropType, w: number, h: number) {
  switch (type) {
    case "paperTarget":
      return <path d={targetSilhouette(w, h)} fill="#d9b98a" stroke="#6b4a2f" strokeWidth={1.1} />;
    case "tuxedoTarget": {
      const shoulderY = -h * 0.28;
      return (
        <>
          <path d={targetSilhouette(w, h)} fill="#18181b" stroke="#000" strokeWidth={1.1} />
          <polygon
            points={`${-w * 0.2},${shoulderY} ${w * 0.2},${shoulderY} 0,${h * 0.18}`}
            fill="#fafafa"
          />
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
      return (
        <>
          <path d={popperSilhouette(w, h)} fill="#a1a1aa" stroke="#3f3f46" strokeWidth={1.1} />
          <rect x={-w * 0.32} y={h * 0.38} width={w * 0.64} height={h * 0.09} fill="#3f3f46" />
          <circle cx={-w * 0.12} cy={h * 0.34} r={w * 0.07} fill="#18181b" />
          <circle cx={w * 0.12} cy={h * 0.34} r={w * 0.07} fill="#18181b" />
        </>
      );
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
    case "wall": {
      const topHalf = w * 0.42;
      const planks = [-0.3, 0, 0.3].map((f) => {
        const y = h * f;
        // Interpolate the plank's endpoints between the trapezoid's bottom (±w/2) and top (±topHalf) edges.
        const t = (y + h / 2) / h;
        const half = w / 2 + (topHalf - w / 2) * t;
        return { y, half };
      });
      return (
        <>
          <polygon
            points={`${-w / 2},${h / 2} ${w / 2},${h / 2} ${topHalf},${-h / 2} ${-topHalf},${-h / 2}`}
            fill="#a9825a"
            stroke="#4a3320"
            strokeWidth={1.5}
          />
          {planks.map((p, i) => (
            <line key={i} x1={-p.half} y1={p.y} x2={p.half} y2={p.y} stroke="#4a3320" strokeWidth={0.6} />
          ))}
        </>
      );
    }
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
    case "barrel": {
      // A slanted 3D cylinder — top and bottom ellipses joined by a shaded
      // body, viewed at a slight angle rather than a flat top-down disc.
      const rx = w / 2;
      const ry = h * 0.17;
      const topY = -h / 2 + ry;
      const bottomY = h / 2 - ry;
      const bodyH = bottomY - topY;
      return (
        <>
          <ellipse cx={0} cy={bottomY} rx={rx} ry={ry} fill="#1e3a8a" />
          <rect x={-rx} y={topY} width={rx} height={bodyH} fill="#1e40af" />
          <rect x={0} y={topY} width={rx} height={bodyH} fill="#3b82f6" />
          <rect x={rx * 0.2} y={topY} width={rx * 0.22} height={bodyH} fill="#93c5fd" opacity={0.55} />
          <ellipse cx={0} cy={topY} rx={rx} ry={ry} fill="#2563eb" stroke="#1e3a8a" strokeWidth={0.9} />
          <ellipse cx={0} cy={topY} rx={rx * 0.6} ry={ry * 0.6} fill="none" stroke="#1e40af" strokeWidth={0.7} />
        </>
      );
    }
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
  onDelete,
  readOnly = false,
}: {
  prop: StageProp;
  selected: boolean;
  pointToFt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
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
        onPointerDown={readOnly ? undefined : handleDown}
        onPointerMove={readOnly ? undefined : handleMove}
        onPointerUp={readOnly ? undefined : handleUp}
        onPointerCancel={readOnly ? undefined : handleUp}
        style={{ cursor: readOnly ? "default" : "grab", touchAction: "none" }}
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
      {selected && !readOnly && (
        <g
          transform={`translate(${cx + w / 2 + 8} ${cy - h / 2 - 8})`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onDelete(prop.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle r={7} fill="#dc2626" stroke="white" strokeWidth={1} />
          <line x1={-3} y1={-3} x2={3} y2={3} stroke="white" strokeWidth={1.4} strokeLinecap="round" />
          <line x1={3} y1={-3} x2={-3} y2={3} stroke="white" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

export function StageBuilderScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const svgRef = useRef<SVGSVGElement>(null);

  const [props, setProps] = useState<StageProp[]>(() => loadCurrentLayout(userId).props);
  const [courseOfFire, setCourseOfFire] = useState<string>(() => loadCurrentLayout(userId).courseOfFire);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedStage[]>(() => listSavedStages(userId));
  const [saveName, setSaveName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [mode, setMode] = useState<"build" | "score">("build");
  const [powerFactor, setPowerFactor] = useState<"major" | "minor">("minor");
  const [aHits, setAHits] = useState(0);
  const [cHits, setCHits] = useState(0);
  const [dHits, setDHits] = useState(0);
  const [poppersHit, setPoppersHit] = useState(0);
  const [misses, setMisses] = useState(0);
  const [noShootHits, setNoShootHits] = useState(0);
  const [scoreTimeSeconds, setScoreTimeSeconds] = useState<number | null>(null);

  useEffect(() => {
    saveCurrentLayout(userId, props, courseOfFire);
  }, [userId, props, courseOfFire]);

  const selected = props.find((p) => p.id === selectedId) ?? null;

  // Paper targets are engaged for (up to) two scored hits at 5 pts each = 10
  // pts max; steel poppers score a flat 5 pts with no A/C/D zones.
  const paperCount = props.filter((p) => p.type === "paperTarget" || p.type === "tuxedoTarget").length;
  const popperCount = props.filter((p) => p.type === "steelPopper").length;
  const targetCount = paperCount + popperCount;
  const maxPoints = paperCount * 10 + popperCount * 5;
  const cValue = powerFactor === "major" ? 4 : 3;
  const dValue = powerFactor === "major" ? 2 : 1;
  const totalPoints =
    aHits * 5 + cHits * cValue + dHits * dValue + poppersHit * 5 - misses * 10 - noShootHits * 10;
  const hitFactor = scoreTimeSeconds != null && scoreTimeSeconds > 0 ? totalPoints / scoreTimeSeconds : null;

  function launchStage() {
    setPowerFactor("minor");
    setAHits(0);
    setCHits(0);
    setDHits(0);
    setPoppersHit(0);
    setMisses(0);
    setNoShootHits(0);
    setScoreTimeSeconds(null);
    setSelectedId(null);
    setMode("score");
  }

  function resetScore() {
    setPowerFactor("minor");
    setAHits(0);
    setCHits(0);
    setDHits(0);
    setPoppersHit(0);
    setMisses(0);
    setNoShootHits(0);
    setScoreTimeSeconds(null);
  }

  // No-shoot inserts are physically mounted in front of whatever they overlap,
  // so always paint (and hit-test) them above every other prop, regardless of
  // add order — a stable sort keeps everything else in its existing order.
  const renderOrder = [...props].sort(
    (a, b) => (a.type === "noShoot" ? 1 : 0) - (b.type === "noShoot" ? 1 : 0),
  );

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

  function deleteProp(id: string) {
    setProps((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((current) => (current === id ? null : current));
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
    const stage = saveNamedStage(userId, name, props, courseOfFire);
    setSaved((prev) => [stage, ...prev]);
    setSaveName("");
  }

  function handleLoad(stage: SavedStage) {
    setProps(stage.props.map((p) => ({ ...p })));
    setCourseOfFire(stage.courseOfFire ?? "");
    setSelectedId(null);
  }

  function handleDeleteSaved(id: string) {
    deleteSavedStage(userId, id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  const viewW = BAY_WIDTH_FT * PX_PER_FT;
  const viewH = BAY_DEPTH_FT * PX_PER_FT;
  const gridStepYd = 5;
  const gridStepFt = gridStepYd * 3;

  const gravelDefs = (
    <defs>
      <pattern id="rr-gravel" width={20} height={20} patternUnits="userSpaceOnUse">
        <rect width={20} height={20} fill="#e8e2d4" />
        <circle cx={3} cy={4} r={1.1} fill="#c9c0a8" opacity={0.7} />
        <circle cx={9} cy={2} r={0.8} fill="#b3a88d" opacity={0.6} />
        <circle cx={15} cy={5} r={1.3} fill="#d6cdb5" opacity={0.6} />
        <circle cx={6} cy={11} r={0.9} fill="#a89c7e" opacity={0.5} />
        <circle cx={13} cy={13} r={1} fill="#c9c0a8" opacity={0.6} />
        <circle cx={18} cy={16} r={0.7} fill="#b3a88d" opacity={0.5} />
        <circle cx={2} cy={17} r={1.2} fill="#d6cdb5" opacity={0.55} />
        <circle cx={10} cy={18} r={0.8} fill="#a89c7e" opacity={0.5} />
        <circle cx={17} cy={9} r={0.6} fill="#c9c0a8" opacity={0.5} />
      </pattern>
    </defs>
  );

  const gridLines = (
    <>
      <rect x={0} y={0} width={viewW} height={viewH} fill="url(#rr-gravel)" />
      {Array.from({ length: Math.floor(BAY_WIDTH_FT / gridStepFt) + 1 }, (_, i) => i * gridStepFt).map((ft) => (
        <g key={`v${ft}`}>
          <line
            x1={ft * PX_PER_FT}
            y1={0}
            x2={ft * PX_PER_FT}
            y2={viewH}
            stroke="#7c7565"
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
          <text x={ft * PX_PER_FT + 2} y={9} fontSize={7} fill="#57534e" className="font-mono">
            {ft / 3}
          </text>
        </g>
      ))}
      {Array.from({ length: Math.floor(BAY_DEPTH_FT / gridStepFt) + 1 }, (_, i) => i * gridStepFt).map((ft) => (
        <g key={`h${ft}`}>
          <line
            x1={0}
            y1={ft * PX_PER_FT}
            x2={viewW}
            y2={ft * PX_PER_FT}
            stroke="#7c7565"
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
          {ft > 0 && (
            <text x={2} y={ft * PX_PER_FT - 2} fontSize={7} fill="#57534e" className="font-mono">
              {ft / 3}
            </text>
          )}
        </g>
      ))}
      <text x={viewW - 6} y={viewH - 6} textAnchor="end" fontSize={8} fill="#57534e" className="font-mono">
        grid: 5 yd
      </text>
    </>
  );

  if (mode === "score") {
    return (
      <HeroBackdrop>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <TitleFrame>
            <BackLink onClick={() => setMode("build")} label="Edit Stage" />
            <h1 className="text-2xl font-bold uppercase tracking-wide text-orange-500">
              Score This Stage
            </h1>
            <p className="text-center text-sm text-zinc-400">
              {targetCount} target{targetCount === 1 ? "" : "s"}/poppers · {maxPoints} max points
            </p>
          </TitleFrame>

          <Panel>
            <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full rounded-sm border-2 border-zinc-900 bg-white">
              {gravelDefs}
              {gridLines}
              {renderOrder.map((p) => (
                <PropIcon
                  key={p.id}
                  prop={p}
                  selected={false}
                  pointToFt={() => null}
                  onSelect={() => {}}
                  onMove={() => {}}
                  onDelete={() => {}}
                  readOnly
                />
              ))}
            </svg>
          </Panel>

          {courseOfFire.trim() && (
            <Panel>
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Course of Fire
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{courseOfFire}</p>
            </Panel>
          )}

          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Hit Factor Calculator
              </div>
              <button
                onClick={resetScore}
                className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Max points available ({paperCount} target{paperCount === 1 ? "" : "s"} × 10, {popperCount}{" "}
                popper{popperCount === 1 ? "" : "s"} × 5)
              </span>
              <span className="font-mono text-lg font-bold text-white">{maxPoints}</span>
            </div>

            <div className="flex gap-2">
              {(["minor", "major"] as const).map((pf) => (
                <button
                  key={pf}
                  onClick={() => setPowerFactor(pf)}
                  className={`flex-1 rounded border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    powerFactor === pf
                      ? "border-orange-500 bg-orange-950/40 text-orange-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {pf} power factor
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Stepper label="A (5 pts)" value={aHits} onChange={setAHits} color="emerald" />
              <Stepper label={`C (${cValue} pts)`} value={cHits} onChange={setCHits} color="amber" />
              <Stepper
                label={`D (${dValue} pt${dValue === 1 ? "" : "s"})`}
                value={dHits}
                onChange={setDHits}
                color="orange"
              />
              <Stepper label="Poppers Hit (5 pts)" value={poppersHit} onChange={setPoppersHit} color="emerald" />
              <Stepper label="Misses (−10)" value={misses} onChange={setMisses} color="red" />
              <Stepper label="No-Shoots (−10)" value={noShootHits} onChange={setNoShootHits} color="violet" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={scoreTimeSeconds ?? ""}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  setScoreTimeSeconds(Number.isNaN(n) ? null : n);
                }}
                placeholder="0.00"
                className="w-28 rounded-md border-2 border-orange-700 bg-zinc-900 px-2 py-1.5 text-xl font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
              />
              <span className="text-sm text-zinc-500">seconds (raw time)</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-orange-900/50 bg-zinc-900/60 p-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Total points</div>
                <div className="font-mono text-xl font-bold text-white">{totalPoints}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Hit factor</div>
                <div className="font-mono text-2xl font-bold text-orange-400">
                  {hitFactor != null ? hitFactor.toFixed(4) : "—"}
                </div>
              </div>
            </div>
          </Panel>

          <button
            onClick={() => setMode("build")}
            className="w-full rounded-md border-2 border-orange-700 px-4 py-2.5 font-semibold uppercase tracking-wide text-orange-400 hover:bg-orange-950"
          >
            ← Back to Edit Stage
          </button>
        </div>
      </HeroBackdrop>
    );
  }

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
            {gravelDefs}
            {gridLines}
            {renderOrder.map((p) => (
              <PropIcon
                key={p.id}
                prop={p}
                selected={p.id === selectedId}
                pointToFt={pointToFt}
                onSelect={setSelectedId}
                onMove={moveProp}
                onDelete={deleteProp}
              />
            ))}
          </svg>
          <div className="text-center text-[11px] uppercase tracking-wide text-zinc-500">
            ↓ Shooter Start
          </div>
        </Panel>

        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">
            Course of Fire
          </div>
          <textarea
            value={courseOfFire}
            onChange={(e) => setCourseOfFire(e.target.value)}
            placeholder="Describe the stage — start position, strings, engagement order, scoring notes…"
            rows={4}
            className="w-full resize-y rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-orange-600 focus:outline-none"
          />
        </Panel>

        <button
          onClick={launchStage}
          disabled={targetCount === 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-3 text-center font-semibold uppercase tracking-wide text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          🚀 Launch Stage to Score ({targetCount} target{targetCount === 1 ? "" : "s"})
        </button>

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
                onClick={() => selectedId && deleteProp(selectedId)}
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
