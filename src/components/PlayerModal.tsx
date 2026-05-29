import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { TIER_STYLES, calculatePlayerPoints } from '../defaultData';
import { X, User, Award, Percent, Globe, Sparkles } from 'lucide-react';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Player) => void;
  playerToEdit: Player | null;
}

const DEFAULT_FORM_STATE = {
  username: '',
  role: 'Combat Specialist',
  points: 10,
  region: 'EU',
  isPremium: true,
  customSkinUrl: '',
  tierRankings: {
    vanilla: 'UNR',
    sword: 'UNR',
    axe: 'UNR',
    uhc: 'UNR',
    smp: 'UNR',
    pot: 'UNR',
    nethop: 'UNR',
    mace: 'UNR'
  }
};

const TIERS_LIST = Object.keys(TIER_STYLES);

export default function PlayerModal({
  isOpen,
  onClose,
  onSave,
  playerToEdit
}: PlayerModalProps) {
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [skinPreview, setSkinPreview] = useState('https://mc-heads.net/avatar/MHF_Steve/48');
  // Tracks whether the user has manually edited the points field for this
  // session of the modal. Once true, tier changes will no longer overwrite it.
  const [pointsDirty, setPointsDirty] = useState(false);

  // Compute points dynamically from the current tier selections in the form
  const computedPoints = calculatePlayerPoints(formData.tierRankings);

  // Load selected player data into form when editing
  useEffect(() => {
    if (playerToEdit) {
      setFormData({
        username: playerToEdit.username,
        role: playerToEdit.role,
        points: playerToEdit.points,
        region: playerToEdit.region,
        isPremium: playerToEdit.isPremium !== false,
        customSkinUrl: playerToEdit.customSkinUrl || '',
        tierRankings: { ...playerToEdit.tierRankings }
      });
      if (playerToEdit.isPremium !== false) {
        setSkinPreview(`https://mc-heads.net/avatar/${playerToEdit.username}/48`);
      } else {
        setSkinPreview(playerToEdit.customSkinUrl || 'https://mc-heads.net/avatar/MHF_Steve/48');
      }
    } else {
      setFormData(DEFAULT_FORM_STATE);
      setSkinPreview('https://mc-heads.net/avatar/MHF_Steve/48');
    }
    // Reset the dirty flag whenever the modal opens or switches players
    setPointsDirty(false);
  }, [playerToEdit, isOpen]);

  // Handle typing of Minecraft username and update avatar preview depending on premium status
  useEffect(() => {
    if (formData.isPremium) {
      if (formData.username.trim()) {
        const handler = setTimeout(() => {
          setSkinPreview(`https://mc-heads.net/avatar/${formData.username}/48`);
        }, 500); // debounce API updates
        return () => clearTimeout(handler);
      } else {
        setSkinPreview('https://mc-heads.net/avatar/MHF_Steve/48');
      }
    } else {
      setSkinPreview(formData.customSkinUrl || 'https://mc-heads.net/avatar/MHF_Steve/48');
    }
  }, [formData.username, formData.isPremium, formData.customSkinUrl]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTierChange = (modeKey: keyof Player['tierRankings'], value: string) => {
    setFormData((prev) => {
      const nextTiers = {
        ...prev.tierRankings,
        [modeKey]: value
      };
      // Only auto-recompute points while the user hasn't manually edited them
      const nextPoints = pointsDirty ? prev.points : calculatePlayerPoints(nextTiers);
      return {
        ...prev,
        tierRankings: nextTiers,
        points: nextPoints
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) return;

    onSave({
      id: playerToEdit?.id || Date.now().toString(),
      username: formData.username.trim(),
      role: formData.role.trim() || 'Combat Cadet',
      points: Number(formData.points) || 0,
      region: formData.region.trim().toUpperCase() || 'GL',
      isPremium: formData.isPremium,
      customSkinUrl: formData.isPremium ? '' : formData.customSkinUrl,
      tierRankings: formData.tierRankings
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sculk-deep/80 backdrop-blur-md">
      {/* Container Frame */}
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-sculk-soft/40 bg-sculk-darker/95 p-6 shadow-sculk-active max-h-[90vh] overflow-y-auto"
        id="player-modal-container"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6 border-b border-teal-950 pb-4">
          <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-500/30 text-sculk-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-gray-100 tracking-wide">
              {playerToEdit ? 'Edit Player Rankings' : 'Add New Server Player'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure player metadata, combat regions, and tier results
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* Realtime Live Minecraft Face Preview */}
            <div className="md:col-span-3 flex flex-col items-center justify-center p-4 rounded-xl bg-sculk-dark border border-teal-950/80">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-mono">Avatar Preview</span>
              <div className="relative">
                <div className="absolute inset-0 bg-sculk-glow/30 rounded-xl blur-md" />
                <img
                  src={skinPreview}
                  alt="Minecraft skin preview"
                  onError={() => setSkinPreview('https://mc-heads.net/avatar/MHF_Steve/48')}
                  className="relative w-20 h-20 rounded-xl border-2 border-sculk-glow object-cover bg-sculk-deep"
                />
              </div>
              <span className="text-[11px] font-mono font-medium text-teal-400 mt-3 max-w-full truncate">
                {formData.username || 'Steve'}
              </span>
            </div>

            {/* Inputs Form block */}
            <div className="md:col-span-9 space-y-4">
              
              {/* Username Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-display">
                  <User className="w-3.5 h-3.5 text-sculk-soft" /> Minecraft Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YusufGuner1k"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950/80 text-gray-100 placeholder-zinc-650 focus:outline-none focus:border-sculk-glow focus:ring-1 focus:ring-sculk-glow/20 transition-all font-mono text-sm"
                />
              </div>

              {/* Premium Account Toggle & Custom Skin Upload */}
              <div className="bg-sculk-dark/30 hover:bg-sculk-dark/50 border border-teal-950/80 p-4 rounded-xl space-y-3.5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-gray-200 block font-display">
                      Premium Minecraft Account
                    </label>
                    <span className="text-[10px] text-zinc-500 block leading-tight">
                      Instantly pull official skin & avatar coordinates from Mojang servers
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isPremium', !formData.isPremium)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isPremium ? 'bg-[#0cedf7]' : 'bg-teal-950 shadow-inner'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${
                        formData.isPremium ? 'translate-x-5 bg-[#010508]' : 'translate-x-0 bg-zinc-500'
                      }`}
                    />
                  </button>
                </div>

                {/* Custom Skin Upload Section for Offline Accounts */}
                {!formData.isPremium && (
                  <div className="border border-dashed border-teal-950 bg-[#000508]/40 p-4 rounded-lg space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-teal-400">Offline Custom Skin Profile</span>
                      {formData.customSkinUrl && (
                        <button
                          type="button"
                          onClick={() => handleInputChange('customSkinUrl', '')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider transition-colors"
                        >
                          Clear Uploaded Skin
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Drag-and-drop Image Upload */}
                      <label className="flex flex-col items-center justify-center p-4 border border-dashed border-cyan-500/20 hover:border-cyan-500/40 rounded-xl bg-sculk-deep/60 hover:bg-sculk-deep cursor-pointer group transition-all text-center">
                        <div className="p-2 bg-cyan-900/10 border border-cyan-500/20 text-cyan-400 rounded-lg group-hover:scale-105 transition-all">
                          <User className="w-5 h-5 text-sculk-glow" />
                        </div>
                        <span className="text-xs font-medium text-zinc-300 mt-2 font-display">Upload Skin Model</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Drag & drop or Click to choose image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                handleInputChange('customSkinUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {/* Manual Image URL Input fallback */}
                      <div className="flex flex-col justify-center space-y-2">
                        <span className="text-[11px] font-mono text-zinc-400 block">Or provide web image link:</span>
                        <input
                          type="text"
                          placeholder="e.g. https://domain.com/skin.png"
                          value={formData.customSkinUrl}
                          onChange={(e) => handleInputChange('customSkinUrl', e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-sculk-deep border border-teal-950 text-xs text-gray-100 placeholder-zinc-700 focus:outline-none focus:border-sculk-glow font-mono"
                        />
                        <span className="text-[9px] text-zinc-500 leading-tight">
                          Accepts PNG/JPG/WEBP custom skin templates, renders or standard custom avatars.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role & Point details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Role / Rank Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-display">
                    <Award className="w-3.5 h-3.5 text-sculk-soft" /> Custom Role Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Combat Specialist"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950/80 text-gray-100 placeholder-zinc-650 focus:outline-none focus:border-sculk-glow focus:ring-1 focus:ring-sculk-glow/20 transition-all text-sm"
                  />
                </div>

                {/* Score Points Input */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-display">
                    <Percent className="w-3.5 h-3.5 text-sculk-soft" /> Overall Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    placeholder="e.g. 100"
                    value={formData.points}
                    onChange={(e) => {
                      setPointsDirty(true);
                      handleInputChange('points', Number(e.target.value));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950/80 text-gray-100 placeholder-zinc-750 focus:outline-none focus:border-sculk-glow focus:ring-1 focus:ring-sculk-glow/20 transition-all font-mono text-sm"
                  />
                  <div className="mt-1 text-[10px] text-zinc-500 font-sans tracking-tight">
                    Computed standard tier points: <span className="text-teal-400 font-mono font-bold">{computedPoints} pts</span>
                    {pointsDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          setPointsDirty(false);
                          handleInputChange('points', computedPoints);
                        }}
                        className="ml-2 text-sculk-glow hover:underline cursor-pointer"
                      >
                        Reset to computed
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Region Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-display">
                  <Globe className="w-3.5 h-3.5 text-sculk-soft" /> Combat Region (ME, EU, NA, GL, etc.)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. ME"
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-sculk-deep border border-teal-950/80 text-gray-100 placeholder-zinc-650 focus:outline-none focus:border-sculk-glow focus:ring-1 focus:ring-sculk-glow/20 transition-all uppercase font-mono text-sm"
                />
              </div>

            </div>
          </div>

          {/* Grid of Competitive Tiers */}
          <div className="border-t border-teal-950/80 pt-4">
            <h3 className="text-xs font-medium uppercase tracking-widest text-sculk-soft mb-3 font-display">
              Game Mode Placements
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sculk-dark/40 p-4 rounded-xl border border-teal-950">
              {Object.keys(formData.tierRankings).map((mode) => {
                const modeKey = mode as keyof Player['tierRankings'];
                return (
                  <div key={mode} className="flex flex-col">
                    <label className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1 font-mono font-bold">
                      {mode}
                    </label>
                    <select
                      value={formData.tierRankings[modeKey]}
                      onChange={(e) => handleTierChange(modeKey, e.target.value)}
                      className="px-2 py-1.5 rounded bg-sculk-deep border border-teal-950 text-xs text-gray-100 focus:outline-none focus:border-sculk-glow font-mono"
                    >
                      {TIERS_LIST.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier === 'UNR' ? 'UNR (Unranked)' : tier}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-teal-950/80 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-teal-950/20 border border-teal-900/60 text-zinc-400 hover:text-gray-100 hover:bg-teal-950/40 transition-all cursor-pointer text-sm font-display"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-[#0dffe2]/15 border border-[#0dffe2]/40 text-sculk-glow hover:bg-sculk-glow hover:text-slate-950 font-bold hover:shadow-sculk transition-all duration-200 cursor-pointer text-sm font-display"
            >
              {playerToEdit ? 'Save Changes' : 'Install Player'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
