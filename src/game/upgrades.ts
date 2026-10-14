/** Between-wave upgrades (pick 1 of 3, Archero style). */
export type UpgradeId =
  | "reach"
  | "power"
  | "explosive"
  | "homing"
  | "shockwave"
  | "repair"
  | "spin";

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  description: string;
  /** Short emoji icon for the card. */
  icon: string;
  /** Max times it can be picked (repair is unlimited). */
  max: number;
};

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  reach: {
    id: "reach",
    name: "Event Horizon",
    description: "+25% field reach and +4 objects held",
    icon: "🌀",
    max: 3,
  },
  power: {
    id: "power",
    name: "Heavy Throw",
    description: "Throws fly 20% faster and hit 30% harder",
    icon: "💪",
    max: 3,
  },
  explosive: {
    id: "explosive",
    name: "Volatile Matter",
    description: "Thrown objects explode on impact, hurting nearby invaders",
    icon: "💥",
    max: 3,
  },
  homing: {
    id: "homing",
    name: "Gravity Lock",
    description: "Thrown objects curve toward their target",
    icon: "🎯",
    max: 2,
  },
  shockwave: {
    id: "shockwave",
    name: "Release Pulse",
    description: "Releasing the field blasts nearby invaders away",
    icon: "📡",
    max: 3,
  },
  repair: {
    id: "repair",
    name: "Core Patch",
    description: "Restore 35 core health",
    icon: "🛠️",
    max: 99,
  },
  spin: {
    id: "spin",
    name: "Hyper Orbit",
    description:
      "Objects snap into orbit 50% faster and orbits deal contact damage",
    icon: "🪐",
    max: 2,
  },
};

/** Current stack count of an upgrade. */
export function stacks(upgrades: Record<string, number>, id: UpgradeId) {
  return upgrades[id] ?? 0;
}
