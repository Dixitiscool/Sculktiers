import { Player, GameMode, ServerConfig, TierStyle } from './types';

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  serverName: "Sculk Tiers",
  serverIp: "play.sculktiers.xyz",
  discordUrl: "https://discord.gg/nt25PqJCG2"
};

export const GAME_MODES: GameMode[] = [
  { id: 'overall', name: 'Overall', iconName: 'Trophy' },
  { id: 'vanilla', name: 'Vanilla', iconName: 'Diamond' },
  { id: 'sword', name: 'Sword', iconName: 'Sword' },
  { id: 'axe', name: 'Axe', iconName: 'Axe' },
  { id: 'uhc', name: 'UHC', iconName: 'Heart' },
  { id: 'smp', name: 'SMP', iconName: 'Globe' },
  { id: 'pot', name: 'Pot', iconName: 'FlaskConical' },
  { id: 'nethop', name: 'NethOP', iconName: 'Shield' },
  { id: 'mace', name: 'Mace', iconName: 'Hammer' }
];

export const TIER_STYLES: Record<string, TierStyle> = {
  "HT1": { bg: "bg-red-500/15", border: "border-red-500/50", text: "text-red-400", glow: "shadow-[0_0_10px_rgba(239,68,68,0.25)]" },
  "LT1": { bg: "bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-400", glow: "shadow-[0_0_10px_rgba(244,63,94,0.2)]" },
  "HT2": { bg: "bg-amber-500/15", border: "border-amber-500/50", text: "text-amber-400", glow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]" },
  "LT2": { bg: "bg-yellow-500/15", border: "border-yellow-600/40", text: "text-yellow-400", glow: "shadow-[0_0_10px_rgba(202,138,4,0.2)]" },
  "HT3": { bg: "bg-purple-500/15", border: "border-purple-500/50", text: "text-purple-400", glow: "shadow-[0_0_10px_rgba(168,85,247,0.25)]" },
  "LT3": { bg: "bg-fuchsia-500/15", border: "border-fuchsia-600/40", text: "text-fuchsia-400", glow: "shadow-[0_0_10px_rgba(192,38,211,0.2)]" },
  "HT4": { bg: "bg-blue-500/15", border: "border-blue-500/50", text: "text-blue-400", glow: "shadow-[0_0_10px_rgba(59,130,246,0.25)]" },
  "LT4": { bg: "bg-indigo-500/15", border: "border-indigo-600/40", text: "text-indigo-400", glow: "shadow-[0_0_10px_rgba(79,70,229,0.2)]" },
  "HT5": { bg: "bg-pink-500/15", border: "border-pink-500/50", text: "text-pink-400", glow: "shadow-[0_0_10px_rgba(236,72,153,0.25)]" },
  "LT5": { bg: "bg-violet-500/15", border: "border-violet-600/40", text: "text-violet-400", glow: "shadow-[0_0_10px_rgba(124,58,237,0.2)]" },
  "UNR": { bg: "bg-white/5", border: "border-zinc-800", text: "text-zinc-500", glow: "" }
};

export const TIER_POINTS: Record<string, number> = {
  "HT1": 50,
  "LT1": 45,
  "HT2": 40,
  "LT2": 35,
  "HT3": 30,
  "LT3": 25,
  "HT4": 20,
  "LT4": 15,
  "HT5": 10,
  "LT5": 5
};

export function calculatePlayerPoints(tierRankings: Player['tierRankings']): number {
  let pts = 10; // every player starts from 10 points
  if (!tierRankings) return pts;
  const categories: (keyof Player['tierRankings'])[] = [
    'vanilla', 'sword', 'axe', 'uhc', 'smp', 'pot', 'nethop', 'mace'
  ];
  for (const cat of categories) {
    const r = tierRankings[cat];
    if (r && TIER_POINTS[r] !== undefined) {
      pts += TIER_POINTS[r];
    }
  }
  return pts;
}

export const DEFAULT_PLAYERS: Player[] = [
  {
    id: "0",
    username: "OutlinerXD",
    role: "Combat Champion",
    points: 210,
    region: "EU",
    tierRankings: {
      vanilla: "UNR",
      sword: "HT1",
      axe: "HT1",
      uhc: "HT1",
      smp: "UNR",
      pot: "UNR",
      nethop: "UNR",
      mace: "HT1"
    }
  },
  {
    id: "100",
    username: "MmorgEntity",
    role: "Combat Elite",
    points: 210,
    region: "EU",
    tierRankings: {
      vanilla: "HT2",
      sword: "HT2",
      axe: "LT2",
      uhc: "LT2",
      smp: "UNR",
      pot: "HT1",
      nethop: "UNR",
      mace: "UNR"
    }
  },
  {
    id: "1",
    username: "YusufGuner1k",
    role: "Combat Specialist",
    points: 75,
    region: "ME",
    tierRankings: {
      vanilla: "LT2",
      sword: "LT5",
      axe: "LT5",
      uhc: "LT5",
      smp: "LT5",
      pot: "LT5",
      nethop: "LT5",
      mace: "UNR"
    }
  },
  {
    id: "4",
    username: "deviiofwarer",
    role: "Combat Cadet",
    points: 90,
    region: "ME",
    tierRankings: {
      vanilla: "LT5",
      sword: "LT5",
      axe: "LT3",
      uhc: "LT3",
      smp: "HT1",
      pot: "LT5",
      nethop: "HT1",
      mace: "LT5"
    }
  },
  {
    id: "5",
    username: "Reclaction",
    role: "Combat Cadet",
    points: 110,
    region: "ME",
    tierRankings: {
      vanilla: "LT5",
      sword: "LT3",
      axe: "LT3",
      uhc: "LT3",
      smp: "HT4",
      pot: "UNR",
      nethop: "UNR",
      mace: "UNR"
    }
  },
  {
    id: "10",
    username: "ScytheLegend",
    role: "Combat Veteran",
    points: 235,
    region: "EU",
    tierRankings: {
      vanilla: "HT1",
      sword: "HT2",
      axe: "LT1",
      uhc: "HT3",
      smp: "HT3",
      pot: "LT2",
      nethop: "LT5",
      mace: "LT5"
    }
  }
];
