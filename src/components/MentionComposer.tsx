import React, { useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { TeamMember } from '../utils/supabase';

const ROLE_TAGS = ['admin', 'supervisor', 'arborist', 'apprentice'];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

interface MentionComposerProps {
  teamMembers: TeamMember[];
  onSubmit: (text: string) => void | Promise<void>;
  placeholder?: string;
  submitLabel?: string;
}

export const MentionComposer: React.FC<MentionComposerProps> = ({ teamMembers, onSubmit, placeholder = 'Write a message… use @name or @role to notify someone', submitLabel = 'Post' }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    const roleMatches = ROLE_TAGS.filter(r => r.startsWith(q)).map(r => ({ tag: r, label: `@${r}`, sub: 'everyone in this role' }));
    const nameMatches = teamMembers
      .filter(m => m.active && slug(m.name).startsWith(q))
      .map(m => ({ tag: slug(m.name.split(' ')[0] || m.name), label: m.name, sub: m.role }));
    return [...roleMatches, ...nameMatches].slice(0, 6);
  }, [query, teamMembers]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const upToCursor = val.slice(0, cursor);
    const match = upToCursor.match(/@([a-zA-Z0-9_.'-]*)$/);
    if (match) { setQuery(match[1]); setSuggestOpen(true); }
    else setSuggestOpen(false);
  };

  const applySuggestion = (tag: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const upToCursor = text.slice(0, cursor);
    const replaced = upToCursor.replace(/@([a-zA-Z0-9_.'-]*)$/, `@${tag} `);
    const next = replaced + text.slice(cursor);
    setText(next);
    setSuggestOpen(false);
    requestAnimationFrame(() => el?.focus());
  };

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        className="input-field"
        style={{ resize: 'vertical', minHeight: '64px' }}
        value={text}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); } }}
      />
      {suggestOpen && suggestions.length > 0 && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', background: 'var(--surface-overlay)', border: '1px solid var(--border-bright)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 10, minWidth: '220px', overflow: 'hidden' }}>
          {suggestions.map(s => (
            <button key={s.tag} onClick={() => applySuggestion(s.tag)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s.sub}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={!text.trim() || sending}>
          <Send size={14} /> {sending ? 'Sending…' : submitLabel}
        </button>
      </div>
    </div>
  );
};
