import React from 'react';
import type { TeamMember } from '../utils/supabase';
import { BoardThread } from './BoardThread';

interface MessageBoardProps {
  teamMembers: TeamMember[];
}

export const MessageBoard: React.FC<MessageBoardProps> = ({ teamMembers }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <div>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Crew Board</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Announcements and safety notices for the whole team. Use @name or @role to notify someone directly.</p>
      </div>
      <div className="card" style={{ padding: '20px 24px', maxWidth: '760px' }}>
        <BoardThread contextType="announcement" teamMembers={teamMembers} notifyTitle="New crew board post" showPinning compact />
      </div>
    </div>
  );
};
