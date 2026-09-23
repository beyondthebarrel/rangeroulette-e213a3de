// Data model for the Competition Mode "Build Your Own Stage" tool — a simple
// top-down sketch editor for planning a USPSA-style stage layout. This is an
// original tool for laying out props, not a reproduction of any USPSA diagram.

export type PropType =
  | "paperTarget"
  | "tuxedoTarget"
  | "steelPopper"
  | "noShoot"
  | "hardcover"
  | "wall"
  | "faultLine"
  | "shootingBox"
  | "barrel";

export interface StageProp {
  id: string;
  type: PropType;
  /** Feet from the left edge of the bay. */
  x: number;
  /** Feet from the downrange (target) edge of the bay. */
  y: number;
  /** Degrees, 0 = facing downrange. */
  rotation: number;
  scaleX: number;
  scaleY: number;
  label: string;
}

export interface SavedStage {
  id: string;
  name: string;
  savedAt: string;
  props: StageProp[];
}

/** Bay footprint, in feet — a generous default range-bay size for sketching. */
export const BAY_WIDTH_FT = 50;
export const BAY_DEPTH_FT = 80;
export const PX_PER_FT = 8;

/** Base footprint per prop type at scale 1, in feet — width (x) by depth (y) in local space. */
export const BASE_SIZE_FT: Record<PropType, { w: number; h: number }> = {
  paperTarget: { w: 1.5, h: 2.5 },
  tuxedoTarget: { w: 1.5, h: 2.5 },
  steelPopper: { w: 1.5, h: 1.5 },
  noShoot: { w: 1.5, h: 2.5 },
  hardcover: { w: 2, h: 0.4 },
  wall: { w: 6, h: 1 },
  faultLine: { w: 8, h: 0.3 },
  shootingBox: { w: 3, h: 3 },
  barrel: { w: 1.5, h: 1.5 },
};

/** Props whose length and width/thickness are worth adjusting independently. */
export const RECTANGULAR_TYPES = new Set<PropType>(["wall", "faultLine", "shootingBox", "hardcover"]);

export interface PropDef {
  type: PropType;
  name: string;
}

export const PROP_DEFS: PropDef[] = [
  { type: "paperTarget", name: "Paper Target" },
  { type: "tuxedoTarget", name: "Tuxedo Target" },
  { type: "steelPopper", name: "Steel Popper" },
  { type: "noShoot", name: "No-Shoot" },
  { type: "hardcover", name: "Hard Cover" },
  { type: "wall", name: "Wall" },
  { type: "faultLine", name: "Fault Line" },
  { type: "shootingBox", name: "Shooting Box" },
  { type: "barrel", name: "Blue Barrel" },
];

let uid = 0;
export function makePropId(): string {
  uid += 1;
  return `p${Date.now().toString(36)}${uid}`;
}

export function nextLabel(type: PropType, existing: StageProp[]): string {
  if (type === "shootingBox") {
    const n = existing.filter((p) => p.type === "shootingBox").length;
    return `Box ${String.fromCharCode(65 + (n % 26))}`;
  }
  // Paper and tuxedo targets share one T1, T2, T3… sequence, same as a real
  // stage diagram numbers its targets regardless of which style is used.
  const counterGroup: Partial<Record<PropType, PropType[]>> = {
    paperTarget: ["paperTarget", "tuxedoTarget"],
    tuxedoTarget: ["paperTarget", "tuxedoTarget"],
  };
  const prefix: Partial<Record<PropType, string>> = {
    paperTarget: "T",
    tuxedoTarget: "T",
    steelPopper: "P",
    noShoot: "NS",
    hardcover: "HC",
  };
  const p = prefix[type];
  if (!p) return "";
  const group = counterGroup[type] ?? [type];
  const count = existing.filter((x) => group.includes(x.type)).length + 1;
  return `${p}${count}`;
}

export function createProp(type: PropType, existing: StageProp[], x: number, y: number): StageProp {
  return {
    id: makePropId(),
    type,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    label: nextLabel(type, existing),
  };
}
