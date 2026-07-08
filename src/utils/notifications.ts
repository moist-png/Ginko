import { supabase } from './supabase';
import type { AppNotification, NotificationType, LinkType, TeamMember } from './supabase';
import { getCurrentUser } from './auth';

const ROLE_TAGS: TeamMember['role'][] = ['admin', 'supervisor', 'arborist', 'apprentice'];

// Turn a name like "Sarah Jones" into the tag someone would type: "sarahjones"
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Finds every @mention in a piece of text and resolves it to the team
 * members it should notify.
 *   @admin / @supervisor / @arborist / @apprentice  -> everyone active with that role
 *   @firstname / @"first last" (no spaces needed)    -> that specific person
 * Matching is case-insensitive and ignores spaces/punctuation in names.
 */
export const parseMentions = (text: string, teamMembers: TeamMember[]): TeamMember[] => {
  const matches = text.match(/@([a-zA-Z0-9_.'-]+)/g) || [];
  if (matches.length === 0) return [];

  const tags = Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
  const active = teamMembers.filter(m => m.active);
  const result = new Map<string, TeamMember>();

  for (const tag of tags) {
    if ((ROLE_TAGS as string[]).includes(tag)) {
      active.filter(m => m.role === tag).forEach(m => result.set(m.id, m));
      continue;
    }
    // Match by first name, or full name with spaces stripped
    const byName = active.find(m =>
      slug(m.name) === tag || slug(m.name.split(' ')[0] || '') === tag
    );
    if (byName) result.set(byName.id, byName);
  }

  return Array.from(result.values());
};

export const createNotification = async (opts: {
  recipientProfileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkType?: LinkType;
  linkId?: string;
}) => {
  const actor = getCurrentUser();
  // Don't notify yourself for your own actions
  if (opts.recipientProfileId === actor?.id) return;
  const { error } = await supabase.from('notifications').insert({
    recipient_profile_id: opts.recipientProfileId,
    actor_profile_id: actor?.id ?? null,
    type: opts.type,
    title: opts.title,
    body: opts.body || '',
    link_type: opts.linkType ?? null,
    link_id: opts.linkId ?? null,
  });
  if (error) console.error('Failed to create notification:', error);
};

// Notify every team member mentioned (by @role or @name) in a piece of text.
// Skips anyone without a linked login (nothing to notify) and the author.
export const notifyMentions = async (
  text: string,
  teamMembers: TeamMember[],
  context: { title: string; linkType?: LinkType; linkId?: string }
) => {
  const mentioned = parseMentions(text, teamMembers).filter(m => m.profile_id);
  await Promise.all(mentioned.map(m => createNotification({
    recipientProfileId: m.profile_id as string,
    type: 'mention',
    title: context.title,
    body: text.length > 140 ? text.slice(0, 140) + '…' : text,
    linkType: context.linkType,
    linkId: context.linkId,
  })));
};

// Notify a set of team members (e.g. everyone newly assigned to a job/quote).
export const notifyAssignment = async (
  teamMembers: TeamMember[],
  assignedIds: string[],
  context: { title: string; linkType: LinkType; linkId: string }
) => {
  const targets = teamMembers.filter(m => assignedIds.includes(m.id) && m.profile_id);
  await Promise.all(targets.map(m => createNotification({
    recipientProfileId: m.profile_id as string,
    type: 'assignment',
    title: context.title,
    body: 'You were assigned to this.',
    linkType: context.linkType,
    linkId: context.linkId,
  })));
};

// Notify a set of team members that something they're assigned to changed status.
export const notifyStatusChange = async (
  teamMembers: TeamMember[],
  assignedIds: string[],
  context: { title: string; linkType: LinkType; linkId: string }
) => {
  const targets = teamMembers.filter(m => assignedIds.includes(m.id) && m.profile_id);
  await Promise.all(targets.map(m => createNotification({
    recipientProfileId: m.profile_id as string,
    type: 'status_change',
    title: context.title,
    linkType: context.linkType,
    linkId: context.linkId,
  })));
};

export const fetchMyNotifications = async (limit = 30): Promise<AppNotification[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return data || [];
};

export const markNotificationRead = async (id: string) => {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
};

export const markAllNotificationsRead = async () => {
  const user = getCurrentUser();
  if (!user) return;
  await supabase.from('notifications').update({ read: true }).eq('recipient_profile_id', user.id).eq('read', false);
};

// Live updates: calls `onInsert` whenever a new notification arrives for
// the signed-in user. Returns an unsubscribe function.
export const subscribeToNotifications = (onInsert: (n: AppNotification) => void): (() => void) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const channel = supabase
    .channel(`notifications-${user.id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `recipient_profile_id=eq.${user.id}`,
    }, (payload) => onInsert(payload.new as AppNotification))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};
