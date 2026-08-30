import React, { useState } from 'react';
import { StickyNote, Plus, Trash2, Edit2, Play, Check, X } from 'lucide-react';
import { Note } from '../../types';
import { formatTime, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';

interface NotesPanelProps {
  mediaId: number;
  notes: Note[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onRefreshNotes: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  mediaId,
  notes,
  currentTime,
  onSeek,
  onRefreshNotes,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');
  const [attachTimestamp, setAttachTimestamp] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSaveNew = async () => {
    if (!content.trim()) return;
    try {
      await api.notes.create(mediaId, {
        content: content.trim(),
        timestamp: attachTimestamp ? currentTime : undefined,
      });
      setContent('');
      setIsAdding(false);
      onRefreshNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.notes.delete(id);
      onRefreshNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (id: number, currentTimestamp?: number | null) => {
    if (!editContent.trim()) return;
    try {
      await api.notes.update(id, {
        content: editContent.trim(),
        timestamp: currentTimestamp ?? undefined,
      });
      setEditingId(null);
      onRefreshNotes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <StickyNote className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="text-xs font-semibold text-slate-200">Notes ({notes.length})</h4>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Add New Note */}
      {isAdding && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 space-y-2">
          <textarea
            placeholder="Write session note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            autoFocus
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attachTimestamp}
                onChange={(e) => setAttachTimestamp(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Attach {formatTime(currentTime)}</span>
            </label>

            <div className="flex gap-2">
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
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-1.5">
        {notes && notes.length > 0 ? (
          notes.map((n) => {
            const isEditing = editingId === n.id;

            if (isEditing) {
              return (
                <div key={n.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1.5">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(n.id, n.timestamp)}
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
                key={n.id}
                className="group p-2.5 rounded-lg hover:bg-slate-900 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {n.timestamp !== undefined && n.timestamp !== null && (
                      <button
                        onClick={() => onSeek(n.timestamp!)}
                        className="mono text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        title="Seek"
                      >
                        {formatTime(n.timestamp)}
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500">{formatDate(n.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(n.id);
                        setEditContent(n.content);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            No notes recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
