export interface Player {
  id: string;
  username: string;
  role: string;
  points: number;
  region: string;
  isPremium?: boolean;
  customSkinUrl?: string;
  tierRankings: {
    vanilla: string;
    sword: string;
    axe: string;
    uhc: string;
    smp: string;
    pot: string;
    nethop: string;
    mace: string;
  };
}

export interface GameMode {
  id: keyof Player['tierRankings'] | 'overall';
  name: string;
  iconName: string; // Used to determine icon in UI
}

export interface ServerConfig {
  serverName: string;
  serverIp: string;
  discordUrl: string;
}

export type TierStyle = {
  bg: string;
  border: string;
  text: string;
  glow: string;
};

export interface CustomAdmin {
  username: string;
  // passkey is server-side only (bcrypt hashed). The client never sees it
  // and the field is kept optional purely for legacy compatibility.
  passkey?: string;
  role: 'owner' | 'admin';
  createdAt: string;
}

export interface AdminLog {
  id: string;
  filename: string;
  timestamp: string;
  adminName: string;
  role: string;
  ipAddress: string;
  action: string;
  content: string;
}

