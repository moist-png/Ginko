import React, { useState } from 'react';
import { Note } from '../types';
import { Plus, Edit2, Trash2, StickyNote } from 'lucide-react';

interface NotesSectionProps {
  notes: Note[];
  readOnly?: boolean;
  onUpdate: (notes: Note[]) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ notes, readOnly = false, onUpdate }) => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const categories = [
    { value: 'observation', label: 'Observation', color: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]' },
    { value: 'recommendation', label: 'Recommendation', color: 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]' },
    { value: 'safety', label: 'Safety Concern', color: 'bg-[var(--surface-overlay)] text-[var(--danger)]' },
    { value: 'treatment', label: 'Treatment', color: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]' },
    { value: 'other', label: 'Other', color: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]' }
  ];

  const createNote = () => {
    if (readOnly) return;
    const newNote: Note = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: '',
      content: '',
      category: 'observation',
      timestamp: Date.now()
    };
    setEditingNote(newNote);
    setIsCreating(true);
  };

  const saveNote = (note: Note) => {
    if (readOnly) return;
    if (isCreating) {
      onUpdate([...notes, note]);
      setIsCreating(false);
    } else {
      onUpdate(notes.map(n => n.id === note.id ? note : n));
    }
    setEditingNote(null);
  };

  const deleteNote = (noteId: string) => {
    if (readOnly) return;
    onUpdate(notes.filter(note => note.id !== noteId));
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[4];
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Notes & Observations</h2>
        {!readOnly && (
          <button
            onClick={createNote}
            className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
          >
            <Plus size={20} />
            Add Note
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No notes yet</h3>
          <p className="text-[var(--text-muted)] mb-4">Add notes to document your observations and recommendations</p>
          {!readOnly && (
            <button
              onClick={createNote}
              className="inline-flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Plus size={20} />
              Add First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => {
            const categoryInfo = getCategoryInfo(note.category);
            return (
              <div key={note.id} className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{note.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {new Date(note.timestamp).toLocaleDateString()} at {new Date(note.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!readOnly && (
                      <>
                        <button
                          onClick={() => setEditingNote(note)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1 text-[var(--danger)] hover:opacity-80 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{note.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Editor Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-raised)] rounded-lg max-w-2xl w-full max-h-full overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {isCreating ? 'Add New Note' : 'Edit Note'}
              </h3>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setIsCreating(false);
                }}
                className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Enter note title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Category
                </label>
                <select
                  value={editingNote.category}
                  onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Content
                </label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={8}
                  placeholder="Enter your note content..."
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setEditingNote(null);
                    setIsCreating(false);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveNote(editingNote)}
                  disabled={!editingNote.title.trim() || !editingNote.content.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--canopy)] text-[var(--cream)] rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Create Note' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};