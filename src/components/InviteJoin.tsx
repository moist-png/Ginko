import React, { useEffect, useState } from 'react';
import { TreePine, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import type { TeamMember } from '../utils/supabase';
import { signUpWithInvite } from '../utils/auth';

interface InviteJoinProps {
  code: string;
}

export const InviteJoin: React.FC<InviteJoinProps> = ({ code }) => {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('team_members').select('*').eq('invite_code', code).eq('invite_status', 'pending').maybeSingle();
      if (data) { setInvite(data as TeamMember); setName((data as TeamMember).name); setEmail((data as TeamMember).email || ''); }
      setLoading(false);
    })();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 6) { setError('Fill in your name, email, and a password of at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      await signUpWithInvite(email.trim(), password, name.trim(), code);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--canopy), var(--forest-light))', border: '1px solid var(--border-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <TreePine size={32} color="var(--leaf)" />
          </div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', color: 'var(--text-primary)' }}>You're invited to Ginkgo</h1>
        </div>
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (loading) return <Shell><p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Checking your invite…</p></Shell>;

  if (!invite) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b3433d' }}>
        <AlertCircle size={18} />
        <p style={{ fontSize: '14px' }}>This invite link isn't valid — it may have already been used. Ask your admin to send you a new one.</p>
      </div>
    </Shell>
  );

  if (done) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
        <CheckCircle2 size={28} color="var(--leaf)" />
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Account created. Check your email to confirm it, then sign in from the main app.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
        You've been added to the team as <strong style={{ color: 'var(--leaf)', textTransform: 'capitalize' }}>{invite.role}</strong>. Set up your login below.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label>Full Name</label>
          <div style={{ position: 'relative' }}>
            <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" style={{ paddingLeft: '38px' }} />
          </div>
        </div>
        <div>
          <label>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" style={{ paddingLeft: '38px' }} />
          </div>
        </div>
        <div>
          <label>Choose a Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="input-field" style={{ paddingLeft: '38px' }} />
          </div>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(180,60,60,0.1)', border: '1px solid rgba(180,60,60,0.25)', color: '#b3433d', fontSize: '13px' }}>
            <AlertCircle size={14} />{error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
          {submitting ? 'Creating account…' : 'Create My Account'}
        </button>
      </form>
    </Shell>
  );
};
