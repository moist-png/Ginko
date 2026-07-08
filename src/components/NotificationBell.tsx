import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, AtSign, UserPlus, RefreshCw, Megaphone, Info } from 'lucide-react';
import type { AppNotification } from '../utils/supabase';
import { fetchMyNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications } from '../utils/notifications';

interface NotificationBellProps {
  onOpenJob: (id: string) => void;
  onOpenQuote: (id: string) => void;
  onOpenBoard: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  assignment: UserPlus,
  mention: AtSign,
  status_change: RefreshCw,
  announcement: Megaphone,
  info: Info,
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenJob, onOpenQuote, onOpenBoard }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => setItems(await fetchMyNotifications());

  useEffect(() => {
    load();
    const unsubscribe = subscribeToNotifications((n) => setItems(prev => [n, ...prev]));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = items.filter(i => !i.read).length;

  const handleClick = async (n: AppNotification) => {
    if (!n.read) { await markNotificationRead(n.id); setItems(prev => prev.map(i => i.id === n.id ? { ...i, read: true } : i)); }
    setOpen(false);
    if (n.link_type === 'job' && n.link_id) onOpenJob(n.link_id);
    else if (n.link_type === 'quote' && n.link_id) onOpenQuote(n.link_id);
    else if (n.link_type === 'board') onOpenBoard();
  };

  const handleMarkAll = async () => { await markAllNotificationsRead(); setItems(prev => prev.map(i => ({ ...i, read: true }))); };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', padding: '7px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Notifications">
        <Bell size={15} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#c84040', color: 'white', borderRadius: '999px', fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '340px', maxHeight: '420px', overflowY: 'auto', background: 'var(--surface-overlay)', border: '1px solid var(--border-bright)', borderRadius: '12px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--leaf)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ padding: '24px 14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>You're all caught up.</p>
          ) : (
            items.map(n => {
              const Icon = ICONS[n.type] || Info;
              return (
                <button key={n.id} onClick={() => handleClick(n)} style={{ display: 'flex', gap: '10px', width: '100%', padding: '11px 14px', background: n.read ? 'transparent' : 'rgba(90,143,90,0.08)', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} color="var(--leaf)" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)' }}>{n.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
