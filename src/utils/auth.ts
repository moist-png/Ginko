import { supabase } from './supabase';
import type { Profile, TeamMember } from './supabase';

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string, name: string, inviteCode: string) => {
  const VALID_CODES = ['ARBOR2024', 'ARBORPRO', 'TREEPRO'];
  if (!VALID_CODES.includes(inviteCode.toUpperCase())) throw new Error('Invalid invite code');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return data;
};

// Signup via a personal invite link (see TeamManagement "Generate invite link").
// The invite code is baked into the account's metadata; a database trigger
// links this new login to the matching roster row and copies its role.
export const signUpWithInvite = async (email: string, password: string, name: string, inviteCode: string) => {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { name, invite_code: inviteCode } },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
};

export const canUserEdit = (): boolean => true;

// Lightweight synchronous view of the signed-in user, kept in sync with Supabase
// auth so components can read the current user without awaiting a promise.
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

let cachedUser: CurrentUser | null = null;

const userFromSession = (session: { user?: any } | null): CurrentUser | null => {
  const user = session?.user;
  if (!user) return null;
  const name = user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'User');
  return { id: user.id, name, email: user.email || '' };
};

// Prime the cache and keep it updated as the auth state changes.
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedUser = userFromSession(session);
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = userFromSession(session);
});

export const getCurrentUser = (): CurrentUser | null => cachedUser;

export const getUserDisplayName = (): string => cachedUser?.name || 'Unknown';

// ---------------------------------------------------------------------------
// Team hierarchy: which roster row (if any) the signed-in login is linked to,
// and what that gives them permission to do. Cached the same way as
// CurrentUser above, and re-fetched whenever the session changes.
// A window event fires whenever this changes, so components can react to it
// (see the existing 'arborpro-synced' event in utils/offline.ts for the
// same pattern).
// ---------------------------------------------------------------------------
export type TeamRole = 'admin' | 'supervisor' | 'arborist' | 'apprentice';
const ROLE_RANK: Record<TeamRole, number> = { admin: 4, supervisor: 3, arborist: 2, apprentice: 1 };

export const TEAM_MEMBER_CHANGED_EVENT = 'arborpro-team-member-changed';

let cachedTeamMember: TeamMember | null = null;
let teamMemberLoaded = false;

const setCachedTeamMember = (tm: TeamMember | null) => {
  cachedTeamMember = tm;
  teamMemberLoaded = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEAM_MEMBER_CHANGED_EVENT, { detail: tm }));
  }
};

export const refreshCurrentTeamMember = async (): Promise<TeamMember | null> => {
  const user = getCurrentUser();
  if (!user) { setCachedTeamMember(null); return null; }
  const { data } = await supabase.from('team_members').select('*').eq('profile_id', user.id).maybeSingle();
  setCachedTeamMember((data as TeamMember) || null);
  return cachedTeamMember;
};

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) refreshCurrentTeamMember();
  else setCachedTeamMember(null);
});
// Prime on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) refreshCurrentTeamMember();
});

export const getCurrentTeamMember = (): TeamMember | null => cachedTeamMember;
export const isTeamMemberLoaded = (): boolean => teamMemberLoaded;
export const getCurrentRole = (): TeamRole | null => (cachedTeamMember?.role as TeamRole) || null;

// True if the signed-in user's linked role meets or exceeds `min`.
// Returns false (fails closed) if they aren't linked to a roster row yet.
export const hasMinRole = (min: TeamRole): boolean => {
  const role = getCurrentRole();
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
};

export const isAdmin = (): boolean => getCurrentRole() === 'admin';
export const isSupervisorOrAbove = (): boolean => hasMinRole('supervisor');

// Can this person assign/reassign work and manage the roster?
export const canManageTeam = (): boolean => isSupervisorOrAbove();

// A job/quote is "mine" if I'm one of its assignees, or it isn't assigned yet.
export const isAssignedToMe = (assignedTo: string[] | undefined): boolean => {
  const id = cachedTeamMember?.id;
  if (!id) return false;
  return !assignedTo || assignedTo.length === 0 || assignedTo.includes(id);
};

// Claim an unlinked roster row as "me" (used for first-time setup — see
// TeamManagement's "This is me" button). Only works on rows nobody has
// claimed yet; enforced again at the database level.
export const claimTeamMember = async (teamMemberId: string) => {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.rpc('claim_team_member', { target_id: teamMemberId });
  if (error) throw error;
  await refreshCurrentTeamMember();
};
