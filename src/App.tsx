import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, GameMode, ServerConfig, CustomAdmin, AdminLog } from './types';
import { 
  DEFAULT_PLAYERS, 
  DEFAULT_SERVER_CONFIG, 
  GAME_MODES,
  calculatePlayerPoints
} from './defaultData';
import LeaderboardRow from './components/LeaderboardRow';
import PlayerModal from './components/PlayerModal';
import SculkBackground from './components/SculkBackground';
import WardenFace from './components/WardenFace';
import { 
  Trophy, 
  Diamond, 
  Sword, 
  Axe,
  Heart, 
  Globe, 
  FlaskConical, 
  Shield, 
  Hammer, 
  Plus, 
  Search, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  Flame, 
  Settings, 
  HelpCircle, 
  Compass, 
  MessageSquare,
  Sparkles,
  Link2,
  Trash2,
  HelpCircle as HelpIcon,
  X,
  FolderOpen,
  FileText,
  Download,
  Eye,
  EyeOff,
  UserCheck,
  PlusCircle
} from 'lucide-react';

// Tier priority values for smart sorting when filtering by category
const TIER_PRIORITY: Record<string, number> = {
  "HT1": 20, "LT1": 19,
  "HT2": 18, "LT2": 17,
  "HT3": 16, "LT3": 15,
  "HT4": 14, "LT4": 13,
  "HT5": 12, "LT5": 11,
  "UNR": 0
};

export default function App() {
  // Load State from LocalStorage (offline cache) or Defaults. Server data,
  // when it arrives on mount, becomes the source of truth and overwrites
  // whatever is here.
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('sculktiers_players');
    if (saved) {
      try {
        return JSON.parse(saved) as Player[];
      } catch {
        // fallthrough to defaults
      }
    }
    return DEFAULT_PLAYERS.map(p => ({
      ...p,
      points: calculatePlayerPoints(p.tierRankings)
    }));
  });

  const [serverConfig, setServerConfig] = useState<ServerConfig>(() => {
    const saved = localStorage.getItem('sculktiers_config');
    return saved ? JSON.parse(saved) : DEFAULT_SERVER_CONFIG;
  });

  // Navigation / Filter State
  const [dbLoaded, setDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overall');
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically trigger hidden Admin Login dialog when typing search query 'adminaccess'
  useEffect(() => {
    if (searchQuery.toLowerCase().trim() === 'adminaccess') {
      setSearchQuery('');
      setAuthError('');
      setIsAuthOpen(true);
    }
  }, [searchQuery]);
  
  // Clipboard feed-back
  const [copiedIP, setCopiedIP] = useState(false);

  // Administrative States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAdminUsername, setConfirmDeleteAdminUsername] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Admins registry — populated from the server (passkeys never leave the
  // server). Empty until the server responds.
  const [adminsRegistry, setAdminsRegistry] = useState<CustomAdmin[]>([]);

  // Currently logged-in admin (server-managed via signed HTTP-only cookie).
  // Restored on mount via /api/me; never persisted in localStorage.
  const [currentAdmin, setCurrentAdmin] = useState<CustomAdmin | null>(null);

  // Keep isAdmin in sync with currentAdmin
  useEffect(() => {
    setIsAdmin(currentAdmin !== null);
  }, [currentAdmin]);

  // Logs folder — server-authoritative; seeded empty until /api/database returns.
  const [logs, setLogs] = useState<AdminLog[]>([]);

  // Modals and view states
  const [isLogsFolderOpen, setIsLogsFolderOpen] = useState(false);
  const [isAdminRegistryOpen, setIsAdminRegistryOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPasskey, setNewAdminPasskey] = useState('');
  const [newAdminError, setNewAdminError] = useState('');
  const [newAdminSuccess, setNewAdminSuccess] = useState('');

  // Refresh logs from the server. Called after every admin action so the
  // displayed audit trail reflects the server's real-IP-stamped entries.
  const refreshLogs = async () => {
    try {
      const res = await fetch('/api/database', { credentials: 'same-origin' });
      if (res.ok) {
        const dbData = await res.json();
        if (Array.isArray(dbData.logs)) setLogs(dbData.logs);
      }
    } catch (err) {
      console.error('Failed to refresh logs:', err);
    }
  };

  // Server-side logging helper. The server stamps real IP + session identity;
  // we just describe the action.
  const addLogEntry = async (
    _adminName: string,
    _role: string,
    action: string,
    message: string,
  ) => {
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, message }),
      });
      if (res.ok) {
        const { log } = await res.json();
        if (log) setLogs(prev => [log, ...prev]);
      }
    } catch (err) {
      console.error('Log POST failed:', err);
    }
  };

  // Settings modification
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempIp, setTempIp] = useState(serverConfig.serverIp);
  const [tempDiscord, setTempDiscord] = useState(serverConfig.discordUrl);

  // Initial slide sweep animation blocker
  const [isLoaded, setIsLoaded] = useState(false);

  // Mirror players/config to localStorage (offline cache) and push to the
  // server. The server gates writes behind admin auth, so anonymous tabs'
  // PUTs become no-ops (401) — that's intentional.
  useEffect(() => {
    localStorage.setItem('sculktiers_players', JSON.stringify(players));
    if (dbLoaded && isAdmin) {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: 'players', data: players })
      }).catch(err => console.error("Players sync error:", err));
    }
  }, [players, dbLoaded, isAdmin]);

  useEffect(() => {
    localStorage.setItem('sculktiers_config', JSON.stringify(serverConfig));
    if (dbLoaded && isAdmin) {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: 'config', data: serverConfig })
      }).catch(err => console.error("Config sync error:", err));
    }
  }, [serverConfig, dbLoaded, isAdmin]);

  // On mount: restore session + load server data (which becomes source of truth).
  useEffect(() => {
    setIsLoaded(true);

    const bootstrap = async () => {
      try {
        // Restore session first so /api/database can return admin-only data.
        const meRes = await fetch('/api/me', { credentials: 'same-origin' });
        if (meRes.ok) {
          const { admin } = await meRes.json();
          if (admin) setCurrentAdmin(admin);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      }

      try {
        const res = await fetch('/api/database', { credentials: 'same-origin' });
        if (res.ok) {
          const dbData = await res.json();
          // Server data always wins on load — no merging with localStorage.
          if (Array.isArray(dbData.players)) setPlayers(dbData.players);
          if (dbData.config) setServerConfig(dbData.config);
          if (Array.isArray(dbData.admins)) setAdminsRegistry(dbData.admins);
          if (Array.isArray(dbData.logs)) setLogs(dbData.logs);
        }
      } catch (err) {
        console.error("Failed to load server-side rankings database:", err);
      } finally {
        setDbLoaded(true);
      }
    };
    bootstrap();
  }, []);


  // Copy server IP
  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(serverConfig.serverIp);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2200);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = serverConfig.serverIp;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedIP(true);
      setTimeout(() => setCopiedIP(false), 2200);
    }
  };

  // Auth passcode processor — server-side bcrypt verification + signed cookie
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPass = passkeyInput.trim();
    if (!cleanedPass) {
      setAuthError('Authentication Error: Passkey cannot be blank.');
      return;
    }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ passkey: cleanedPass }),
      });
      if (!res.ok) {
        setAuthError('Access Denied: Invalid security passkey.');
        return;
      }
      const data = await res.json();
      setCurrentAdmin({ username: data.username, role: data.role, createdAt: new Date().toISOString() });
      setIsAdmin(true);
      setIsAuthOpen(false);
      setPasskeyInput('');
      setAuthError('');
      // Refresh logs so the server-recorded login entry appears immediately
      refreshLogs();
    } catch (err) {
      console.error('Login failed:', err);
      setAuthError('Network error: unable to reach the authentication service.');
    }
  };

  // Admin session sign-out
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    setCurrentAdmin(null);
    setIsAdmin(false);
    setIsLogsFolderOpen(false);
    setIsAdminRegistryOpen(false);
  };


  // Player handlers
  const handleSavePlayer = (playerData: Player) => {
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
    
    const updatedPlayerData = {
      ...playerData
    };
    
    if (playerToEdit) {
      // Find original before editing to calculate a precision delta audit trail
      const original = players.find(p => p.id === updatedPlayerData.id);
      let auditDetail = `Modified player "${updatedPlayerData.username}" ranking profile at ${formattedTime}.`;
      
      if (original) {
        const changes: string[] = [];
        if (original.username !== updatedPlayerData.username) {
          changes.push(`Username updated: "${original.username}" ➔ "${updatedPlayerData.username}"`);
        }
        if (original.points !== updatedPlayerData.points) {
          changes.push(`Overall score altered: ${original.points} pts ➔ ${updatedPlayerData.points} pts`);
        }
        
        // Compare tierRankings
        const modes = Array.from(new Set([...Object.keys(original.tierRankings || {}), ...Object.keys(updatedPlayerData.tierRankings || {})]));
        modes.forEach(mode => {
          const origTier = original.tierRankings?.[mode];
          const newTier = updatedPlayerData.tierRankings?.[mode];
          if (origTier !== newTier) {
            changes.push(`GameMode [${mode.toUpperCase()}] tier shifted: "${origTier || 'NONE'}" ➔ "${newTier || 'NONE'}"`);
          }
        });

        if (changes.length > 0) {
          auditDetail += `\n\nDetailed Changes Applied:\n  - ` + changes.join('\n  - ');
        } else {
          auditDetail += `\n\nNo alterations were made to the properties (records re-saved identically).`;
        }
      }

      setPlayers(prev => prev.map(p => p.id === updatedPlayerData.id ? updatedPlayerData : p));
      if (currentAdmin) {
        addLogEntry(
          currentAdmin.username,
          currentAdmin.role,
          'PLAYER_EDIT',
          auditDetail
        );
      }
    } else {
      const activeTiers = Object.entries(updatedPlayerData.tierRankings || {})
        .map(([mode, tier]) => `${mode.toUpperCase()}: ${tier}`)
        .join(', ');
      
      const auditDetail = `Created a new player tier listing for "${updatedPlayerData.username}" at ${formattedTime}.\n\nStarting Profile Details:\n  - Initial rating: ${updatedPlayerData.points} points (recalculated from tiers)\n  - Assigned competitive game modes: ${activeTiers || 'NONE'}`;

      setPlayers(prev => [updatedPlayerData, ...prev]);
      if (currentAdmin) {
        addLogEntry(
          currentAdmin.username,
          currentAdmin.role,
          'PLAYER_ADD',
          auditDetail
        );
      }
    }
    setPlayerToEdit(null);
  };

  const handleEditClick = (player: Player) => {
    setPlayerToEdit(player);
    setIsPlayerModalOpen(true);
  };

  const handleDeletePlayer = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Manual sorting positioning handlers
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const moving = players[index];
    const target = players[index - 1];
    setPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
    if (currentAdmin && moving && target) {
      addLogEntry(
        currentAdmin.username,
        currentAdmin.role,
        'REORDER_PLAYERS',
        `Reordered list placements: Shifted "${moving.username}" up, preceding "${target.username}".`
      );
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === players.length - 1) return;
    const moving = players[index];
    const target = players[index + 1];
    setPlayers(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
    if (currentAdmin && moving && target) {
      addLogEntry(
        currentAdmin.username,
        currentAdmin.role,
        'REORDER_PLAYERS',
        `Reordered list placements: Shifted "${moving.username}" down, following "${target.username}".`
      );
    }
  };

  // Reset to static defaults
  const handleResetToDefaults = () => {
    setIsResetConfirmOpen(true);
  };

  // Edit server config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setServerConfig({
      serverName: serverConfig.serverName,
      serverIp: tempIp,
      discordUrl: tempDiscord
    });
    if (currentAdmin) {
      addLogEntry(
        currentAdmin.username,
        currentAdmin.role,
        'SERVER_INFO_EDIT',
        `Changed global connection credentials: set routing address to "${tempIp}" and Discord invite link to "${tempDiscord}".`
      );
    }
    setIsConfigOpen(false);
  };

  // Filter and smart sort logic
  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  const filteredAndSortedPlayers = React.useMemo(() => {
    // 1. Search Query Filter (Checks username and rank label)
    let list = players.filter(p => {
      const q = deferredSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return p.username.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.region.toLowerCase().includes(q);
    });

    // 2. Sort depending on active tab
    if (activeTab === 'overall') {
      // Sorted primarily by overall points descending, fallback alphabetical
      return [...list].sort((a,b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.username.localeCompare(b.username);
      });
    } else {
      // Filter out players who are unranked in the selected category
      const modeKey = activeTab as keyof Player['tierRankings'];
      const activeList = list.filter(p => {
        const r = p.tierRankings?.[modeKey];
        return r && r !== 'UNR';
      });

      // Sorted by specific category tier priority rank
      return activeList.sort((a, b) => {
        const priorityA = TIER_PRIORITY[a.tierRankings[modeKey]] ?? 0;
        const priorityB = TIER_PRIORITY[b.tierRankings[modeKey]] ?? 0;
        
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        // Fallback to overall score points if tier is identical
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.username.localeCompare(b.username);
      });
    }
  }, [players, activeTab, deferredSearchQuery]);

  // Game mode icons lookup
  const renderGameModeIcon = (iconName: string) => {
    const classStyle = "w-4 h-4 mr-2";
    switch (iconName) {
      case 'Trophy': return <Trophy className={classStyle} />;
      case 'Diamond': return <Diamond className={classStyle} />;
      case 'Sword': return <Sword className={classStyle} />;
      case 'Heart': return <Heart className={classStyle} />;
      case 'Globe': return <Globe className={classStyle} />;
      case 'FlaskConical': return <FlaskConical className={classStyle} />;
      case 'Shield': return <Shield className={classStyle} />;
      case 'Hammer': return <Hammer className={classStyle} />;
      case 'Axe': return <Axe className={classStyle} />;
      default: return <Trophy className={classStyle} />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#02070a] overflow-hidden selection:bg-sculk-glow/30 selection:text-sculk-glow pb-20">
      
      {/* Interactive Sculk Dust & Fog Particles */}
      <SculkBackground />

      {/* Screen Sweep Entrance Overlay */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div
            initial={{ scaleX: 1, originX: 0 }}
            animate={{ scaleX: 0 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.95, ease: [0.77, 0, 0.175, 1] }}
            className="fixed inset-y-0 left-0 right-0 z-50 bg-gradient-to-r from-sculk-soft via-teal-900 to-[#02070a] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Floating Left-to-Right Shimmer bar */}
      <div className="fixed top-0 left-[-30%] w-[30%] h-1 bg-gradient-to-r from-transparent via-sculk-glow to-transparent opacity-85 z-40 animate-[flyLeftToRight_6s_linear_infinite]" />

      <header className="relative max-w-7xl mx-auto px-4 pt-8 pb-4 z-20">
        
        {/* Admin mode floating indicator bar */}
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between p-3.5 mb-6 rounded-xl border border-yellow-500/30 bg-amber-500/10 backdrop-blur-md text-amber-350 text-xs gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
              </span>
              <p className="font-display font-medium">
                <span className="font-bold uppercase mr-1">ADMIN CONTROL PANEL:</span> 
                Logged in as <span className="font-extrabold text-white underline font-mono">{currentAdmin?.username}</span> 
                <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-yellow-500/25 border border-yellow-500/40 text-yellow-250">{currentAdmin?.role}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => {
                  setPlayerToEdit(null);
                  setIsPlayerModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold hover:bg-yellow-500 hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Player
              </button>
              
              <button 
                onClick={() => {
                  setTempIp(serverConfig.serverIp);
                  setTempDiscord(serverConfig.discordUrl);
                  setIsConfigOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-sculk-soft hover:bg-sculk-soft hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Edit Server Info
              </button>

              {/* View interactive log file system folder - Available to any logged-in admin! */}
              <button 
                onClick={() => setIsLogsFolderOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1.5"
                title="Browse secure log file directory folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" /> Logs Folder
              </button>

              {/* Security Admin Registry Manager - Only accessible if operator has role 'owner'! */}
              {currentAdmin?.role === 'owner' && (
                <button 
                  onClick={() => setIsAdminRegistryOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Make other admins and view passwords"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Admin registry
                </button>
              )}

              <button 
                onClick={handleResetToDefaults}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                title="Wipe client changes"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
              </button>

              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-zinc-350 hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1"
                title="Sign out of administrative console"
              >
                <Lock className="w-3.5 h-3.5 text-yellow-500" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}

        {/* Global Nav & Metadata line */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pb-6 border-b border-teal-950/60">
          
          {/* Logo & Server Identity */}
          <div className="flex items-center gap-4">
            <div className="relative animate-pulse" style={{ animationDuration: '4s' }}>
              <div className="absolute inset-0 bg-sculk-glow/30 rounded-xl blur-md" />
              <WardenFace className="w-12 h-12 relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight flex items-center gap-1 mb-1 bg-gradient-to-r from-sculk-soft via-[#48f3f5] to-sculk-glow bg-clip-text text-transparent animate-glow-text">
                {serverConfig.serverName}
              </h1>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Minecraft Competitive Ranking Hub
              </p>
            </div>
          </div>

          {/* Nav pills */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Home Pill */}
            <button 
              onClick={() => {
                setActiveTab('overall');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-teal-950/15 border border-teal-950 hover:border-sculk-glow/30 hover:bg-teal-950/30 text-xs font-semibold tracking-wide text-zinc-350 transition-all duration-200 uppercase flex items-center cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5 text-sculk-soft" /> Home
            </button>

            {/* Discord Pill */}
            <a 
              href={serverConfig.discordUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-teal-950/15 border border-teal-950 hover:border-sculk-glow/30 hover:bg-teal-950/30 text-xs font-semibold tracking-wide text-zinc-350 transition-all duration-200 uppercase flex items-center"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Discord
            </a>

            {/* Interactive Player Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-teal-950/20 border border-teal-950/60 text-xs text-slate-100 placeholder-zinc-500 focus:outline-none focus:border-sculk-glow focus:ring-1 focus:ring-sculk-glow/20 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* IP copier card widget */}
            <button 
              onClick={handleCopyIp}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-950/30 to-[#0e3b48]/30 border border-[#14ccce]/30 hover:border-sculk-glow/60 text-xs font-semibold text-sculk-soft transition-all duration-200 flex items-center cursor-pointer"
              title="Click to copy Server IP"
            >
              <span className="text-[10px] text-zinc-500 uppercase mr-2 font-mono hidden sm:inline">IP:</span> 
              <span className="font-mono text-sculk-glow mr-2">{serverConfig.serverIp}</span>
              {copiedIP ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sculk-soft" />}
            </button>

            {/* Administrative status indicator of the logged-in operator in top navigation */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-xs font-mono font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="hidden lg:inline text-[10px] text-zinc-400 uppercase">Operator:</span>
                  <span className="font-extrabold">{currentAdmin?.username}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all cursor-pointer"
                  title="Sign Out of Admin Console"
                >
                  <Unlock className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Categories Tab pills slider inside glass containers */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold flex items-center">
              <Sliders className="w-3.5 h-3.5 mr-2 text-sculk-soft" /> 
              Leaderboard Combat Categories
            </h2>
            {searchQuery && (
              <span className="text-[11px] text-zinc-500 font-mono font-medium">
                Showing results for "{searchQuery}"
              </span>
            )}
          </div>
          
          <div className="flex items-center overflow-x-auto pb-3 gap-2 [&::-webkit-scrollbar]:h-1 mt-1">
            {GAME_MODES.map((mode) => {
              const isActive = activeTab === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveTab(mode.id)}
                  className={`relative flex items-center px-4.5 py-3 rounded-xl border font-display transition-all duration-250 shrink-0 cursor-pointer text-xs uppercase tracking-wider font-semibold ${
                    isActive 
                      ? 'bg-sculk-soft/10 border-sculk-glow text-sculk-glow shadow-sculk' 
                      : 'bg-[#040f13]/60 border-teal-950 text-zinc-400 hover:text-white hover:border-sculk-soft/30 hover:bg-[#071920]/40'
                  }`}
                >
                  {renderGameModeIcon(mode.iconName)}
                  <span>{mode.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabBadge"
                      className="absolute bottom-[-1px] left-1/4 right-1/4 h-[2px] bg-sculk-glow"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </header>

      {/* Main Leaderboard Rankings list container */}
      <main className="relative max-w-7xl mx-auto px-4 z-20 mt-2">
        <div className="rounded-2xl bg-sculk-darker/40 border border-teal-950/40 p-4 pb-8 min-h-[400px]">
          
          {/* List Headers */}
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 mb-1.5 text-xs text-zinc-500 uppercase tracking-widest font-mono font-bold border-b border-teal-950/40">
            <div className="flex items-center gap-14">
              <span>Player</span>
            </div>
            {activeTab !== 'overall' && (
              <span className="text-center pr-10">Current Rank status</span>
            )}
            <div className="flex items-center gap-4 pr-3.5">
              <span>Category Placings</span>
              {isAdmin && <span className="w-16 text-right">Actions</span>}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredAndSortedPlayers.length > 0 ? (
              filteredAndSortedPlayers.map((player, index) => {
                // Find actual database rank position
                const actualRank = activeTab === 'overall'
                  ? index + 1
                  : players.findIndex(p => p.id === player.id) + 1; // absolute reordered index
                
                // Let's use the natural index in filtered list as the Rank for standard beautiful UX
                const positionOfList = index + 1;

                return (
                  <LeaderboardRow
                    key={player.id}
                    player={player}
                    rank={positionOfList}
                    highlightedMode={activeTab}
                    isAdmin={isAdmin}
                    onEdit={handleEditClick}
                    onDelete={handleDeletePlayer}
                  />
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-teal-950/50 border border-teal-900/50 flex items-center justify-center text-sculk-soft mb-4 shadow-sculk">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-display font-medium text-gray-200">No Players Located</h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-md">
                  No players are registered on the {activeTab} board matching the criteria '{searchQuery}'.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('overall');
                  }}
                  className="mt-6 px-5 py-2.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-sculk-glow hover:bg-sculk-soft hover:text-slate-950 text-xs font-semibold tracking-wider transition-all uppercase cursor-pointer"
                >
                  Clear all search filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Passkey authentication dialog modal */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md border border-yellow-500/30 bg-sculk-darker p-6 rounded-2xl shadow-sculk-active"
            >
              <button 
                onClick={() => setIsAuthOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                ✕
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-lg font-display font-bold text-gray-150">Admin Panel Authorization</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Authenticate your credentials to modify player stats manually
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Security Lock Pin
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your admin passkey"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-sculk-deep border border-teal-950 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 text-sm font-mono"
                    autoFocus
                    required
                  />
                  {authError && (
                    <p className="text-rose-450 text-[11px] font-mono font-medium mt-1.5">
                      🚨 {authError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(false)}
                    className="w-1/2 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs transition-all cursor-pointer font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded-lg bg-yellow-500/25 border border-yellow-500/50 text-yellow-400 text-xs font-bold uppercase hover:bg-yellow-500 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    Authorize
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit server info modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md border border-teal-500/30 bg-sculk-darker p-6 rounded-2xl shadow-sculk-active animate-none"
            >
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                ✕
              </button>

              <div className="mb-5 flex items-center gap-3 border-b border-teal-950 pb-3">
                <div className="p-2 bg-teal-950 rounded-lg border border-teal-500/30 text-sculk-soft">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-gray-150">Edit Server Info</h3>
                  <p className="text-[11px] text-zinc-500">Configure connection links shown on the landing board</p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" /> Server IP Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. play.sculktiers.xyz"
                    value={tempIp}
                    onChange={(e) => setTempIp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-sculk-glow"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Discord Community Link
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://discord.gg/sculktiers"
                    value={tempDiscord}
                    onChange={(e) => setTempDiscord(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950 text-zinc-200 text-sm focus:outline-none focus:border-sculk-glow"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="w-1/2 py-2 rounded-lg bg-zinc-900 border border-zinc-805 text-zinc-400 text-xs transition-all cursor-pointer uppercase font-semibold font-display"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded-lg bg-sculk-soft/15 border border-sculk-glow text-sculk-soft text-xs font-bold uppercase hover:bg-sculk-soft hover:text-slate-900 transition-all cursor-pointer font-display"
                  >
                    Save Config
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Player Ranking Modal popup */}
      <PlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setPlayerToEdit(null);
        }}
        onSave={handleSavePlayer}
        playerToEdit={playerToEdit}
      />

      {/* 📁 Security Audit Logs Folder Modal */}
      <AnimatePresence>
        {isLogsFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl h-[85vh] border border-cyan-800/30 bg-[#02070a] rounded-2xl shadow-sculk-active overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-teal-950/60 bg-sculk-darker flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-cyan-950/50 border border-cyan-500/40 rounded-lg text-cyan-400">
                    <FolderOpen className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-display font-extrabold text-white flex items-center gap-1.5">
                      Secure Logs Folder Exploration <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">/logs/</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">Intrusion detection tracking and action logging files stored locally</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsLogsFolderOpen(false);
                    setSelectedLog(null);
                  }}
                  className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Log File Directory List */}
                <div className="w-1/3 border-r border-teal-950/60 bg-[#02070c] flex flex-col overflow-y-auto index-0 font-mono text-[11px]">
                  <div className="p-3 bg-teal-950/10 border-b border-teal-950/50 text-zinc-350 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Directory files ({logs.length})</span>
                    <span className="text-[9px] text-[#14ccce] font-bold">TYPE: ASCII TEXT</span>
                  </div>
                  {logs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <button
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`w-full text-left p-3 border-b border-teal-950/30 flex items-start gap-2.5 transition-all outline-none cursor-pointer group ${
                          isSelected 
                            ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-l-cyan-400' 
                            : 'text-zinc-400 hover:bg-[#071920]/40 hover:text-white'
                        }`}
                      >
                        <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold tracking-tight text-zinc-300 group-hover:text-white">{log.filename}</p>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                            <span className="font-bold uppercase text-zinc-400">{log.adminName}</span>
                            <span>•</span>
                            <span>{log.timestamp.split(' ')[1]}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Panel: Selected File View Container (Vim Style ASCII Terminal) */}
                <div className="flex-1 bg-[#010508]/90 flex flex-col">
                  {selectedLog ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Terminal header controls */}
                      <div className="px-4 py-2.5 bg-sculk-darker/60 border-b border-teal-950/50 flex items-center justify-between font-mono text-xs text-zinc-400">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                          <span>cat {selectedLog.filename}</span>
                        </div>
                        <button
                          onClick={() => {
                            // Trigger native file downloader
                            const element = document.createElement("a");
                            const file = new Blob([selectedLog.content], {type: 'text/plain'});
                            element.href = URL.createObjectURL(file);
                            element.download = selectedLog.filename;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all font-bold uppercase flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          <Download className="w-3 h-3" /> Download log
                        </button>
                      </div>

                      {/* File Contents display codeblock */}
                      <div className="flex-1 p-5 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed bg-[#010406] select-text">
                        <pre className="whitespace-pre-wrap">{selectedLog.content}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono">
                      <FileText className="w-12 h-12 text-zinc-800 animate-pulse mb-3" />
                      <p className="text-sm font-display font-medium text-zinc-400">No log file selected</p>
                      <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                        Select an action listing from the directory column in the sidebar to read the corresponding secure logger file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔑 Owner-Only Admin Directory and Passwords Registry modal */}
      <AnimatePresence>
        {isAdminRegistryOpen && currentAdmin?.role === 'owner' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl border border-emerald-555/30 bg-[#02070a]/95 rounded-2xl shadow-sculk-active overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-teal-950/60 bg-sculk-darker flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                      Administrator Credential Manager
                    </h3>
                    <p className="text-[11px] text-zinc-500">Register new admins and review existing access codes securely</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsAdminRegistryOpen(false);
                    setNewAdminName('');
                    setNewAdminPasskey('');
                    setNewAdminError('');
                    setNewAdminSuccess('');
                  }}
                  className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {/* Form to create new Admin */}
                <div className="border border-emerald-950/50 bg-emerald-950/10 p-4.5 rounded-xl">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-400" /> Create New Administrator Account
                  </h4>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setNewAdminError('');
                      setNewAdminSuccess('');

                      const cleanedName = newAdminName.trim();
                      const cleanedPass = newAdminPasskey.trim();

                      if (!cleanedName || !cleanedPass) {
                        setNewAdminError('Error: Both fields must contain text values.');
                        return;
                      }

                      try {
                        const res = await fetch('/api/admins', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'same-origin',
                          body: JSON.stringify({ username: cleanedName, passkey: cleanedPass }),
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setNewAdminError(`Error: ${payload.error || 'Failed to register admin.'}`);
                          return;
                        }
                        if (Array.isArray(payload.admins)) setAdminsRegistry(payload.admins);
                        await refreshLogs();
                        setNewAdminSuccess(`Admin "${cleanedName}" listed in directory successfully!`);
                        setNewAdminName('');
                        setNewAdminPasskey('');
                      } catch (err) {
                        console.error('Create admin failed:', err);
                        setNewAdminError('Error: Network failure while registering admin.');
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Admin Code Name / Username
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SculkySlayer"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#010406] border border-teal-950/80 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Secret Login Passkey
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sculkx7392a"
                        value={newAdminPasskey}
                        onChange={(e) => setNewAdminPasskey(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#010406] border border-teal-950/80 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-2 pt-1.5">
                      {newAdminError && (
                        <p className="text-rose-400 text-[11px] font-mono">🚨 {newAdminError}</p>
                      )}
                      
                      {newAdminSuccess && (
                        <p className="text-emerald-400 text-[11px] font-mono font-medium">✨ {newAdminSuccess}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full md:w-auto self-end px-5 py-2 rounded bg-emerald-500/20 border border-emerald-500/45 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold uppercase transition-all tracking-wider cursor-pointer font-mono"
                      >
                        Register Admin Account & Passkey
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of current Admins with Show/Hide password toggle */}
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider border-b border-teal-950/40 pb-2 mb-3 text-zinc-400">
                    Registered Admin List Directory ({adminsRegistry.length})
                  </h4>

                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                    {adminsRegistry.map((admin) => {
                      const showPass = showPasswordMap[admin.username] || false;
                      const isConfirmingDelete = confirmDeleteAdminUsername === admin.username;
                      
                      return (
                        <div 
                          key={admin.username}
                          className="p-3 bg-[#010406] rounded-lg border border-teal-950/60 flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <div>
                              <p className="text-sm font-semibold text-zinc-200 font-mono">
                                {admin.username} 
                                <span className="ml-2 font-mono text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                                  {admin.role}
                                </span>
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                Created: {new Date(admin.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-2 animate-fadeIn">
                                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">Revoke access?</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/admins/${encodeURIComponent(admin.username)}`, {
                                        method: 'DELETE',
                                        credentials: 'same-origin',
                                      });
                                      const payload = await res.json().catch(() => ({}));
                                      if (res.ok && Array.isArray(payload.admins)) {
                                        setAdminsRegistry(payload.admins);
                                      } else {
                                        console.error('Delete admin failed:', payload.error);
                                      }
                                      await refreshLogs();
                                    } catch (err) {
                                      console.error('Delete admin network error:', err);
                                    }
                                    setConfirmDeleteAdminUsername(null);
                                  }}
                                  className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAdminUsername(null)}
                                  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[10px] uppercase transition-all cursor-pointer font-mono"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-mono bg-sculk-deep border px-3 py-1 rounded border-teal-950/50 text-zinc-350 select-all tracking-wider">
                                  {showPass ? (
                                    <span className="text-emerald-350">{admin.passkey}</span>
                                  ) : (
                                    <span className="text-zinc-600 font-sans font-bold">••••••••</span>
                                  )}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPasswordMap(prev => ({
                                      ...prev,
                                      [admin.username]: !showPass
                                    }));
                                  }}
                                  className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer text-center"
                                  title={showPass ? "Mask passcode value" : "Reveal passkey passcode value"}
                                >
                                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>

                                {admin.role !== 'owner' && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAdminUsername(admin.username)}
                                    className="p-2 rounded bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 hover:text-rose-300 transition-all cursor-pointer font-bold flex items-center justify-center font-mono text-xs uppercase"
                                    title="Revoke all active permissions & Delete Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Player Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-sculk-darker/95 p-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-display font-medium text-gray-100">Delete Ranking Record?</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Are you sure you want to permanently remove <span className="font-bold text-rose-350 underline">
                  {players.find(p => p.id === confirmDeleteId)?.username || 'this player'}
                </span> from the SculkTiers leaderboard ranks? This cannot be undone.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 px-3 rounded-xl bg-teal-950/20 border border-teal-950 text-zinc-400 hover:bg-teal-900/10 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idDeled = confirmDeleteId;
                    setConfirmDeleteId(null);
                    
                    const p = players.find(x => x.id === idDeled);
                    if (p) {
                      setPlayers(prev => prev.filter(pl => pl.id !== idDeled));
                      const formattedTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
                      const activeTiers = Object.entries(p.tierRankings || {})
                        .map(([mode, tier]) => `${mode.toUpperCase()}: ${tier}`)
                        .join(', ');
                      
                      const detailMessage = `Permanently deleted player record of "${p.username}" (ID: ${idDeled}) from the leaderboard ranks at ${formattedTime}.\n\nLast Recorded Standing:\n  - Overall score: ${p.points} points\n  - Competitive tiers: ${activeTiers || 'NONE'}`;

                      if (currentAdmin) {
                        addLogEntry(
                          currentAdmin.username,
                          currentAdmin.role,
                          'PLAYER_DELETE',
                          detailMessage
                        );
                      } else {
                        addLogEntry(
                          'ANONYMOUS',
                          'Visitor',
                          'PLAYER_DELETE',
                          `[Visitor Override] ` + detailMessage
                        );
                      }
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-semibold uppercase tracking-wider shadow-md transition-all cursor-pointer font-display"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Reset to Defaults Confirmation Modal Overlay */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-sculk-darker/95 p-6 shadow-[0_0_50px_rgba(234,179,8,0.15)] text-center"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 mx-auto mb-4">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <h3 className="text-lg font-display font-medium text-gray-100">Reset Leaderboard?</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                This action will wipe all your current local rankings amendments and restore the original static SculkTiers leaderboard. Continue?
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-teal-950/20 border border-teal-950 text-zinc-400 hover:bg-teal-900/10 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetConfirmOpen(false);
                    setPlayers(DEFAULT_PLAYERS);
                    setServerConfig(DEFAULT_SERVER_CONFIG);
                    if (currentAdmin) {
                      addLogEntry(
                        currentAdmin.username,
                        currentAdmin.role,
                        'WIPE_DEFAULTS',
                        `Reset entire leaderboard listings and configuration variables back to standard factory static defaults.`
                      );
                    }
                    handleLogout();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-yellow-950/50 border border-yellow-800/40 text-yellow-405 hover:bg-yellow-500 hover:text-slate-950 text-xs font-semibold uppercase tracking-wider shadow-md transition-all cursor-pointer font-display"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
