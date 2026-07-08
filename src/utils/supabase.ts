import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubvazjvahjmapvqrlsmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x-x4to3wQviv1WNltfIreQ_PoaMQWSh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      sites: { Row: Site; Insert: Partial<Site>; Update: Partial<Site> };
      reports: { Row: Report; Insert: Partial<Report>; Update: Partial<Report> };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job> };
      daily_risks: { Row: DailyRisk; Insert: Partial<DailyRisk>; Update: Partial<DailyRisk> };
      quotes: { Row: Quote; Insert: Partial<Quote>; Update: Partial<Quote> };
      chlorophyll_readings: { Row: ChlorophyllReading; Insert: Partial<ChlorophyllReading>; Update: Partial<ChlorophyllReading> };
      team_members: { Row: TeamMember; Insert: Partial<TeamMember>; Update: Partial<TeamMember> };
      photos: { Row: Photo; Insert: Partial<Photo>; Update: Partial<Photo> };
    };
  };
};

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  profile_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'arborist' | 'supervisor' | 'apprentice';
  colour: string;
  active: boolean;
  reports_to?: string | null;
  invite_code?: string | null;
  invite_status: 'pending' | 'active';
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'assignment' | 'mention' | 'status_change' | 'announcement' | 'info';
export type LinkType = 'job' | 'quote' | 'board';

export interface AppNotification {
  id: string;
  recipient_profile_id: string;
  actor_profile_id?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link_type?: LinkType | null;
  link_id?: string | null;
  read: boolean;
  created_at: string;
}

export type BoardContextType = 'announcement' | 'job' | 'quote';

export interface BoardPost {
  id: string;
  author_profile_id?: string | null;
  context_type: BoardContextType;
  context_id?: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BoardRead {
  id: string;
  post_id: string;
  profile_id: string;
  read_at: string;
}

export interface Site {
  id: string;
  name: string;
  description: string;
  address: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_portal_token: string;
  portal_enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Report {
  id: string;
  site_id?: string;
  title: string;
  client_name: string;
  address: string;
  inspector: string;
  date: string;
  tree_data: any;
  recommendations: string[];
  status: 'draft' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Photo {
  id: string;
  report_id?: string;
  site_id?: string;
  storage_path: string;
  url: string;
  caption: string;
  category: 'overview' | 'trunk' | 'crown' | 'roots' | 'damage' | 'other';
  tree_tag: string;
  taken_at: string;
  created_at: string;
}

export interface Job {
  id: string;
  site_id?: string;
  title: string;
  client_name: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  time_spent: number;
  work_completed: string;
  work_to_complete: string;
  notes: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  job_type: 'assessment' | 'pruning' | 'removal' | 'treatment' | 'consultation' | 'emergency' | 'other';
  hourly_rate: number;
  total_cost: number;
  assigned_to: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DailyRisk {
  id: string;
  site_address: string;
  date: string;
  client_name: string;
  client_mobile: string;
  first_aid_location: string;
  nearest_hospital: string;
  hazards: any;
  hazard_controls: any[];
  signatures: any[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Quote {
  id: string;
  client_name: string;
  address: string;
  mobile: string;
  site_contact: string;
  scheduled_date: string;
  scheduled_time: string;
  job_description: any[];
  additional_equipment: string;
  access_parking: string;
  status: 'new' | 'scheduled' | 'completed';
  archived: boolean;
  assigned_to: string[];
  created_at: string;
  updated_at: string;
}

export interface ChlorophyllReading {
  id: string;
  tree_id: string;
  tree_species: string;
  tree_location: string;
  tree_maturity: 'Juvenile' | 'Semi mature' | 'Mature' | 'Senescent';
  date: string;
  chlorophyll_level: number;
  extension_growth: number;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
