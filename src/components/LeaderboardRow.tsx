import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Player, GameMode } from '../types';
import { TIER_STYLES } from '../defaultData';
import { 
  Trash2, 
  Edit, 
  ShieldCheck, 
  Sword, 
  Heart, 
  Globe, 
  FlaskConical, 
  Shield, 
  Hammer, 
  Award, 
  Diamond,
  Axe 
} from 'lucide-react';

interface LeaderboardRowProps {
  key?: string;
  player: Player;
  rank: number;
  highlightedMode: string;
  isAdmin: boolean;
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
}

// Map of game mode IDs to Lucide Icons with custom sizing
const getModeIcon = (modeId: string) => {
  switch (modeId) {
    case 'vanilla': return <Diamond className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'sword': return <Sword className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'axe': return <Axe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'uhc': return <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />;
    case 'smp': return <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'pot': return <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'nethop': return <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    case 'mace': return <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    default: return <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
  }
};

const modeDisplayNames: Record<string, string> = {
  vanilla: 'Vanilla Combat',
  sword: 'Sword Duel',
  axe: 'Axe PvP',
  uhc: 'UHC PvP',
  smp: 'SMP PvP',
  pot: 'Pot PvP',
  nethop: 'NethOP PvP',
  mace: 'Mace PvP'
};

const MODE_LABELS: Record<string, string> = {
  vanilla: "VAN",
  sword: "SWD",
  axe: "AXE",
  uhc: "UHC",
  smp: "SMP",
  pot: "POT",
  nethop: "NOP",
  mace: "MCE"
};

export default function LeaderboardRow({
  player,
  rank,
  highlightedMode,
  isAdmin,
  onEdit,
  onDelete
 }: LeaderboardRowProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sync state back to normal if username updates
  React.useEffect(() => {
    setImageFailed(false);
  }, [player.username]);

  // Define unique side-cut banner styles for gold/silver/bronze/default
  const getBannerConfig = (position: number) => {
    switch (position) {
      case 1:
        return {
          bg: "bg-gradient-to-r from-[#f5ac38] via-[#f1c40f] to-[#e67e22]",
          border: "border-r border-[#f1c40f]/30",
          shadow: "shadow-[inset_-2px_0_12px_rgba(255,255,255,0.45),0_0_15px_rgba(245,158,11,0.3)]",
          numColor: "text-slate-950 font-black italic",
          rowBorder: "border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
          rowBg: "bg-gradient-to-r from-amber-500/5 via-[#04141a]/95 to-[#040f13]/95"
        };
      case 2:
        return {
          bg: "bg-gradient-to-r from-[#ced6e0] via-[#ffffff] to-[#a4b0be]",
          border: "border-r border-slate-200/30",
          shadow: "shadow-[inset_-2px_0_12px_rgba(255,255,255,0.5),0_0_15px_rgba(203,213,225,0.25)]",
          numColor: "text-slate-900 font-black italic",
          rowBorder: "border-slate-400/25 hover:border-slate-300/60 shadow-[0_0_15px_rgba(203,213,225,0.03)]",
          rowBg: "bg-gradient-to-r from-slate-400/4 via-[#04141a]/95 to-[#040f13]/95"
        };
      case 3:
        return {
          bg: "bg-gradient-to-r from-[#d35400] via-[#e67e22] to-[#a04000]",
          border: "border-r border-[#e67e22]/30",
          shadow: "shadow-[inset_-2px_0_10px_rgba(255,255,255,0.25),0_0_12px_rgba(180,83,9,0.25)]",
          numColor: "text-amber-50 font-black italic",
          rowBorder: "border-amber-700/25 hover:border-amber-600/60 shadow-[0_0_15px_rgba(180,83,9,0.03)]",
          rowBg: "bg-gradient-to-r from-amber-700/3 via-[#04141a]/95 to-[#040f13]/95"
        };
      default:
        return {
          bg: "bg-gradient-to-r from-[#031c22] via-[#093541] to-[#041217]",
          border: "border-r border-cyan-500/15",
          shadow: "shadow-[inset_-1px_0_8px_rgba(20,205,207,0.08)]",
          numColor: "text-zinc-500 font-black italic",
          rowBorder: "border-[rgba(20,205,207,0.12)] hover:border-sculk-glow/40",
          rowBg: "bg-[#040f13]/90"
        };
    }
  };

  const banner = getBannerConfig(rank);

  // Render a 3D full-body or bust representation of the player
  const modelUrl = player.isPremium === false && player.customSkinUrl
    ? player.customSkinUrl
    : (imageFailed
        ? `https://mc-heads.net/body/MHF_Steve/110`
        : `https://mc-heads.net/body/${player.username}/110`
      );

  return (
    <motion.div
      layout
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 mb-3 min-h-[5.5rem] rounded-xl border backdrop-blur-md transition-all duration-300 group hover:shadow-sculk ${banner.rowBorder} ${banner.rowBg}`}
      id={`player-row-${player.id}`}
    >
      {/* Background left-to-right highlight effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />

      {/* Slanted Side-Cut Banner (Gold/Silver/Bronze/Obsidian) container with the overflow-capable 3D player skin rendering */}
      <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-28 md:w-32 pointer-events-none z-10">
        {/* The Clipped Slanted Background */}
        <div 
          className={`absolute inset-0 rounded-l-xl ${banner.bg} ${banner.shadow}`}
          style={{ clipPath: 'polygon(0 0, 100% 0, 78% 100%, 0 100%)' }}
        />
        {/* Large Italic Rank Number */}
        <span className={`absolute left-3.5 sm:left-4 md:left-5 top-1/2 -translate-y-1/2 text-2xl sm:text-3.5xl tracking-tighter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)] select-none ${banner.numColor}`}>
          {rank}.
        </span>
      </div>

      {/* Minecraft 3D Player Model Overlay */}
      <img
        src={modelUrl}
        alt={`${player.username}'s skin render`}
        onError={() => setImageFailed(true)}
        className="absolute bottom-[-6px] sm:bottom-[-10px] md:bottom-[-12px] left-[34px] sm:left-[44px] md:left-[50px] h-[95px] sm:h-[112px] md:h-[120px] object-contain drop-shadow-[-3px_3px_5px_rgba(0,0,0,0.65)] hover:scale-110 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300 z-10 pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* Left side: Position details, skin head, name, and general rank */}
      <div className="flex items-center gap-4 z-10 pl-[84px] sm:pl-[120px] md:pl-[145px]">
        {/* Name and Rank */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-100 font-display font-medium text-base tracking-wide group-hover:text-sculk-glow transition-colors duration-250">
              {player.username}
            </h3>
            {/* Regions badge in standard format */}
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-bold rounded-md bg-cyan-950/70 border border-teal-500/30 text-sculk-soft uppercase shadow-[0_0_8px_rgba(20,205,207,0.1)]">
              {player.region || 'US'}
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 flex items-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 mr-2 animate-pulse" />
            {player.role}
            <span className="mx-2 text-zinc-600">|</span>
            <span className="text-amber-400 font-mono text-[11px] font-bold">
              {player.points} pts
            </span>
          </p>
        </div>
      </div>

      {/* Middle: Highlighted Category Tier indicator (only visible if a game mode is selected) */}
      {highlightedMode !== 'overall' && (
        <div className="hidden lg:flex items-center justify-center px-4 py-2 rounded-lg bg-cyan-950/30 border border-teal-500/20 z-10">
          <span className="text-zinc-400 text-xs mr-3 capitalize font-display">{highlightedMode} Rank:</span>
          {(() => {
            const currentTier = player.tierRankings[highlightedMode as keyof Player['tierRankings']] || 'UNR';
            const style = TIER_STYLES[currentTier] || TIER_STYLES.UNR;
            return (
              <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border ${style.bg} ${style.border} ${style.text} ${style.glow}`}>
                {currentTier}
              </span>
            );
          })()}
        </div>
      )}

      {/* Right side: Individual Game mode Tiers columns + Admin controls */}
      <div className="flex items-center justify-between md:justify-end gap-5 mt-4 md:mt-0 z-10 border-t md:border-none border-teal-950/50 pt-3 md:pt-0 pl-[84px] sm:pl-[120px] md:pl-0">
        {/* Tier bubbles list (shows only assigned/ranked categories, or active tab when filtered) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {Object.entries(player.tierRankings)
            .filter(([mode, tier]) => {
              if (tier === 'UNR') return false; // Never show unranked categories
              if (highlightedMode !== 'overall') {
                return mode === highlightedMode; // Only show active mode when filtering categories
              }
              return true;
            })
            .map(([mode, tier]) => {
              const modeKey = mode as keyof Player['tierRankings'];
              const style = TIER_STYLES[tier] || TIER_STYLES.UNR;
              const isTabActive = highlightedMode === mode;

              return (
                <div 
                  key={mode} 
                  className={`flex flex-col items-center justify-center transition-all duration-305 ${isTabActive ? 'scale-110' : 'opacity-85 hover:opacity-100'}`}
                  title={`${modeDisplayNames[mode] || mode.toUpperCase()}`}
                >
                  {/* Bubble card */}
                  <div 
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all ${style.bg} ${style.border} ${style.glow} ${
                      isTabActive ? 'ring-2 ring-sculk-glow/50 ring-offset-2 ring-offset-sculk-darker' : ''
                    }`}
                  >
                    <span className={`${style.text}`}>
                      {getModeIcon(modeKey)}
                    </span>
                  </div>
                  {/* Text identifier (Tier) */}
                  <span className={`text-[9px] sm:text-[10px] mt-1 font-mono font-extrabold transition-colors ${style.text}`}>
                    {tier}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-teal-900/40">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onEdit(player)}
              className="p-2 rounded-lg bg-teal-950/40 border border-teal-800/40 text-yellow-400 hover:bg-amber-500 hover:text-white hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
              title="Edit Player"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {/* Deletion is admin-only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(player.id)}
              className="p-2 rounded-lg bg-teal-950/40 border border-teal-800/40 text-rose-400 hover:bg-rose-500 hover:text-white hover:shadow-[0_0_10px_rgba(244,63,94,0.2)] transition-all cursor-pointer"
              title="Delete Player"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
