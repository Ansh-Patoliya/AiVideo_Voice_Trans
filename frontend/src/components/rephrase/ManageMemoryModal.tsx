import React, { useState, useEffect } from 'react';
import {
  Brain,
  X,
  Plus,
  Trash2,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';

export interface ToneMemoryData {
  id?: number;
  persona_title: string;
  traits: string[];
  is_active: boolean;
  updated_at?: string;
}

interface ManageMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: ToneMemoryData;
  onMemoryUpdated: (newMemory: ToneMemoryData) => void;
}

export const ManageMemoryModal: React.FC<ManageMemoryModalProps> = ({
  isOpen,
  onClose,
  memory,
  onMemoryUpdated,
}) => {
  const [personaTitle, setPersonaTitle] = useState(memory.persona_title || 'Custom Creator Voice');
  const [traits, setTraits] = useState<string[]>(memory.traits || []);
  const [isActive, setIsActive] = useState<boolean>(memory.is_active ?? true);
  const [newTraitInput, setNewTraitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPersonaTitle(memory.persona_title || 'Custom Creator Voice');
      setTraits(memory.traits || []);
      setIsActive(memory.is_active ?? true);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, memory]);

  if (!isOpen) return null;

  const handleAddTrait = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTraitInput.trim();
    if (!trimmed) return;
    if (traits.includes(trimmed)) {
      setError('This rule already exists in memory.');
      return;
    }
    setTraits([...traits, trimmed]);
    setNewTraitInput('');
    setError(null);
  };

  const handleRemoveTrait = (index: number) => {
    setTraits(traits.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.ai.updateToneMemory({
        persona_title: personaTitle.trim() || 'Custom Creator Voice',
        traits: traits,
        is_active: isActive,
      });
      onMemoryUpdated(updated);
      setSuccess('Memory profile saved!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearMemory = async () => {
    if (!window.confirm('Are you sure you want to clear all learned creator memory? AI will start fresh.')) {
      return;
    }
    setIsClearing(true);
    setError(null);
    try {
      await api.ai.deleteToneMemory();
      const freshMemory: ToneMemoryData = {
        persona_title: 'Custom Creator Voice',
        traits: [],
        is_active: true,
      };
      setPersonaTitle(freshMemory.persona_title);
      setTraits([]);
      onMemoryUpdated(freshMemory);
      setSuccess('All tone memory cleared!');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to clear memory.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Creator Persona Memory</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded-full">
                  Autonomous AI
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gemini remembers your tone preferences from custom prompts and applies them automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Toggle Memory ON/OFF */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Enable Autonomous Memory</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When enabled, your learned tone rules are auto-injected into all rephrase tasks.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Persona Title */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Detected Persona / Voice Identity
            </label>
            <input
              type="text"
              value={personaTitle}
              onChange={(e) => setPersonaTitle(e.target.value)}
              placeholder="e.g., Energetic Reel Creator, Formal Tech Narrator"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Learned Traits & Rules */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Learned Style Rules ({traits.length})</span>
              </label>
              {traits.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearMemory}
                  disabled={isClearing}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {traits.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500">
                <Brain className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-blue-400" />
                <p>No learned traits yet.</p>
                <p className="text-[10px] mt-0.5 text-slate-600">
                  Type any custom instruction while rephrasing, and Gemini will automatically extract your style preferences!
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {traits.map((trait, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 group hover:border-slate-700 transition-colors"
                  >
                    <span className="text-slate-300 text-xs flex-1">{trait}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrait(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Delete this rule"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Manual Trait */}
          <form onSubmit={handleAddTrait} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newTraitInput}
              onChange={(e) => setNewTraitInput(e.target.value)}
              placeholder="+ Add a custom writing rule..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newTraitInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
