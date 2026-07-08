import React, { useEffect, useState } from 'react';
import { Pin, PinOff, Trash2, CheckCircle2, MessageSquare } from 'lucide-react';
import type { TeamMember, BoardPost, BoardContextType } from '../utils/supabase';
import { fetchBoardPosts, createBoardPost, togglePinPost, deleteBoardPost, markPostRead, fetchReaderIds, hasIRead } from '../utils/board';
import { notifyMentions } from '../utils/notifications';
import { getCurrentUser, isSupervisorOrAbove } from '../utils/auth';
import { MentionComposer } from './MentionComposer';

interface BoardThreadProps {
  contextType: BoardContextType;
  contextId?: string;
  teamMembers: TeamMember[];
  notifyTitle: string;         // e.g. "New message on job: Oak St Pruning"
  showPinning?: boolean;       // announcement board only
  compact?: boolean;           // embedded mode inside a job/quote editor
}

export const BoardThread: React.FC<BoardThreadProps> = ({ contextType, contextId, teamMembers, notifyTitle, showPinning = false, compact = false }) => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [readByMe, setReadByMe] = useState<Record<string, boolean>>({});
  const canManage = isSupervisorOrAbove();
  const me = getCurrentUser();

  const load = async () => {
    setLoading(true);
    const data = await fetchBoardPosts(contextType, contextId);
    setPosts(data);
    setLoading(false);
    if (showPinning) {
      const pinned = data.filter(p => p.pinned);
      const counts: Record<string, number> = {};
      const mine: Record<string, boolean> = {};
      await Promise.all(pinned.map(async p => {
        counts[p.id] = (await fetchReaderIds(p.id)).length;
        mine[p.id] = await hasIRead(p.id);
      }));
      setReadCounts(counts);
      setReadByMe(mine);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [contextType, contextId]);

  const authorName = (profileId?: string | null) => {
    if (!profileId) return 'Someone';
    if (profileId === me?.id) return 'You';
    const tm = teamMembers.find(m => m.profile_id === profileId);
    return tm?.name || 'A team member';
  };

  const handlePost = async (text: string) => {
    await createBoardPost(contextType, text, contextId);
    await notifyMentions(text, teamMembers, { title: notifyTitle, linkType: contextType === 'announcement' ? 'board' : contextType, linkId: contextId });
    await load();
  };

  const handlePin = async (post: BoardPost) => { await togglePinPost(post.id, !post.pinned); await load(); };
  const handleDelete = async (post: BoardPost) => { if (confirm('Delete this message?')) { await deleteBoardPost(post.id); await load(); } };
  const handleMarkRead = async (postId: string) => { await markPostRead(postId); await load(); };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--leaf)" />
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)' }}>
            {contextType === 'announcement' ? 'Crew Board' : 'Discussion'}
          </h3>
        </div>
      )}

      <MentionComposer teamMembers={teamMembers} onSubmit={handlePost} submitLabel={contextType === 'announcement' ? 'Post to board' : 'Comment'} />

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</p>
      ) : posts.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {contextType === 'announcement' ? 'No announcements yet.' : 'No comments yet — leave a note for the crew.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {posts.map(post => (
            <div key={post.id} className="card" style={{ padding: '14px 16px', borderColor: post.pinned ? 'rgba(212,160,23,0.4)' : undefined, background: post.pinned ? 'rgba(212,160,23,0.06)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{authorName(post.author_profile_id)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(post.created_at)}</span>
                  {post.pinned && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--amber-light)' }}><Pin size={10} /> Pinned</span>}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {showPinning && canManage && (
                    <button onClick={() => handlePin(post)} title={post.pinned ? 'Unpin' : 'Pin as important'} style={{ padding: '5px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {post.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                  )}
                  {(post.author_profile_id === me?.id || canManage) && (
                    <button onClick={() => handleDelete(post)} title="Delete" style={{ padding: '5px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(180,60,60,0.3)', color: '#e88', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{post.body}</p>
              {showPinning && post.pinned && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{readCounts[post.id] ?? 0} of {teamMembers.filter(m => m.active).length} acknowledged</span>
                  {!readByMe[post.id] ? (
                    <button onClick={() => handleMarkRead(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--leaf)', background: 'transparent', border: '1px solid rgba(90,143,90,0.35)', borderRadius: '999px', padding: '3px 9px', cursor: 'pointer' }}>
                      <CheckCircle2 size={11} /> Mark as read
                    </button>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--leaf)' }}><CheckCircle2 size={11} /> You acknowledged this</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
