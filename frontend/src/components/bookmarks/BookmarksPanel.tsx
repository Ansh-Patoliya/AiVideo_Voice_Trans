import React, { useState } from 'react';
import { Bookmark as BookmarkIcon, Plus, Trash2, Edit2, Play, Check, X } from 'lucide-react';
import { Bookmark } from '../../types';
import { formatTime } from '../../utils/formatters';
import { api } from '../../services/api';

interface BookmarksPanelProps {
  mediaId: number;
  bookmarks: Bookmark[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onRefreshBookmarks: () => void;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  mediaId,
  bookmarks,
  currentTime,
  onSeek,
  onRefreshBookmarks,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTimestamp, setNewTimestamp] = useState(currentTime);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNote, setEditNote] = useState('');

  const handleStartAdd = () => {
    setNewTimestamp(currentTime);
    setNewLabel('');
    setNewNote('');
    setIsAdding(true);
  };

  const handleSaveNew = async () => {
    if (!newLabel.trim()) return;
    try {
      await api.bookmarks.create(mediaId, {
        timestamp: newTimestamp,
        label: newLabel.trim(),
        note: newNote.trim() || undefined,
      });
      setIsAdding(false);
      onRefreshBookmarks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.bookmarks.delete(id);
      onRefreshBookmarks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editLabel.trim()) return;
    try {
      await api.bookmarks.update(id, {
        label: editLabel.trim(),
        note: editNote.trim() || undefined,
      });
      setEditingId(null);
      onRefreshBookmarks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200">Bookmarks ({bookmarks.length})</h4>
        </div>
        <button
          onClick={handleStartAdd}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add at {formatTime(currentTime)}</span>
        </button>
      </div>

      {/* Add New Form */}
      {isAdding && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-blue-400 text-[11px]">
              New bookmark at {formatTime(newTimestamp)}
            </span>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Label (e.g. Key announcement)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            autoFocus
          />

          <input
            type="text"
            placeholder="Optional notes..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-0.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNew}
              className="px-3 py-0.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      <div className="space-y-1">
        {bookmarks && bookmarks.length > 0 ? (
          bookmarks.map((bm) => {
            const isEditing = editingId === bm.id;

            if (isEditing) {
              return (
                <div key={bm.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1.5">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Note..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(bm.id)}
                      className="px-2.5 py-0.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={bm.id}
                className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => onSeek(bm.timestamp)}
                    className="mono text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                    title="Seek"
                  >
                    {formatTime(bm.timestamp)}
                  </button>
                  <span className="text-xs text-slate-200 truncate">{bm.label}</span>
                  {bm.note && <span className="text-[11px] text-slate-500 truncate max-w-xs">&mdash; {bm.note}</span>}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(bm.id);
                      setEditLabel(bm.label);
                      setEditNote(bm.note || '');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(bm.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            No bookmarks saved yet.
          </div>
        )}
      </div>
    </div>
  );
};
