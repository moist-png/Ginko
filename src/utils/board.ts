import { supabase } from './supabase';
import type { BoardPost, BoardContextType } from './supabase';
import { getCurrentUser } from './auth';

export const fetchBoardPosts = async (contextType: BoardContextType, contextId?: string): Promise<BoardPost[]> => {
  let q = supabase.from('board_posts').select('*').eq('context_type', contextType).order('pinned', { ascending: false }).order('created_at', { ascending: false });
  q = contextId ? q.eq('context_id', contextId) : q.is('context_id', null);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data || [];
};

export const createBoardPost = async (
  contextType: BoardContextType,
  body: string,
  contextId?: string
): Promise<BoardPost | null> => {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('board_posts')
    .insert({ author_profile_id: user.id, context_type: contextType, context_id: contextId ?? null, body })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const togglePinPost = async (postId: string, pinned: boolean) => {
  await supabase.from('board_posts').update({ pinned, updated_at: new Date().toISOString() }).eq('id', postId);
};

export const deleteBoardPost = async (postId: string) => {
  await supabase.from('board_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId);
};

export const markPostRead = async (postId: string) => {
  const user = getCurrentUser();
  if (!user) return;
  await supabase.from('board_reads').upsert({ post_id: postId, profile_id: user.id }, { onConflict: 'post_id,profile_id' });
};

export const fetchReadCount = async (postId: string): Promise<number> => {
  const { count } = await supabase.from('board_reads').select('id', { count: 'exact', head: true }).eq('post_id', postId);
  return count || 0;
};

export const fetchReaderIds = async (postId: string): Promise<string[]> => {
  const { data } = await supabase.from('board_reads').select('profile_id').eq('post_id', postId);
  return (data || []).map(r => r.profile_id);
};

export const hasIRead = async (postId: string): Promise<boolean> => {
  const user = getCurrentUser();
  if (!user) return false;
  const { data } = await supabase.from('board_reads').select('id').eq('post_id', postId).eq('profile_id', user.id).maybeSingle();
  return !!data;
};
