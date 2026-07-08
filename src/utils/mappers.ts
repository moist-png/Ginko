// ---------------------------------------------------------------------------
//  Data mappers
//
//  The database stores rows in snake_case (e.g. client_name), while the editor
//  components were written for the older camelCase shape (e.g. clientName).
//  These helpers translate between the two and, just as importantly, fill in
//  sensible defaults so an editor never receives `undefined` where it expects
//  a string / number / array. That double duty is what stops the blank-screen
//  crashes AND lets the forms populate and save correctly.
//
//  Nested JSON fields (tree_data, hazards, hazard_controls, signatures,
//  job_description, recommendations) live in `jsonb` columns, so their inner
//  shape is preserved verbatim on a round-trip.
// ---------------------------------------------------------------------------

import type {
  ArboristReport, TreeData, Job, Site, Quote, DailyRisk, ChlorophyllReading,
} from '../types';

const nowIso = () => new Date().toISOString();
const str = (v: any, d = '') => (v === null || v === undefined ? d : String(v));
const num = (v: any, d = 0) => (typeof v === 'number' && isFinite(v) ? v : (parseFloat(v) || d));
const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

// ---- TreeData -------------------------------------------------------------
export const defaultTreeData = (): TreeData => ({
  treeNumber: '',
  species: '',
  commonName: '',
  dbh: 0,
  height: 0,
  canopySpreadNS: 0,
  canopySpreadEW: 0,
  treeHealth: 'Good',
  extensionGrowth: 0,
  structure: 'Good',
  woundWoodDevelopment: 'Good',
  canopyCover: 0,
  location: '',
});

export const normaliseTreeData = (v: any): TreeData => ({ ...defaultTreeData(), ...(v || {}) });

// ---- Report ---------------------------------------------------------------
export const fromDbReport = (r: any): ArboristReport => ({
  id: str(r?.id) || crypto.randomUUID(),
  title: str(r?.title),
  clientName: str(r?.client_name ?? r?.clientName),
  address: str(r?.address),
  inspector: str(r?.inspector),
  date: str(r?.date) || nowIso().split('T')[0],
  treeData: normaliseTreeData(r?.tree_data ?? r?.treeData),
  photos: arr(r?.photos),
  notes: arr(r?.notes),
  recommendations: arr<string>(r?.recommendations),
  status: (r?.status as ArboristReport['status']) || 'draft',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  siteId: r?.site_id ?? r?.siteId ?? undefined,
});

export const toDbReport = (r: ArboristReport): Record<string, any> => ({
  id: r.id,
  site_id: r.siteId ?? null,
  title: str(r.title),
  client_name: str(r.clientName),
  address: str(r.address),
  inspector: str(r.inspector),
  date: r.date,
  tree_data: r.treeData ?? {},
  recommendations: r.recommendations ?? [],
  status: r.status || 'draft',
  updated_at: nowIso(),
});

// ---- Job ------------------------------------------------------------------
export const fromDbJob = (j: any): Job => ({
  id: str(j?.id) || crypto.randomUUID(),
  title: str(j?.title),
  clientName: str(j?.client_name ?? j?.clientName),
  location: str(j?.location),
  date: str(j?.date) || nowIso().split('T')[0],
  startTime: str(j?.start_time ?? j?.startTime),
  endTime: str(j?.end_time ?? j?.endTime),
  timeSpent: num(j?.time_spent ?? j?.timeSpent),
  workCompleted: str(j?.work_completed ?? j?.workCompleted),
  workToComplete: str(j?.work_to_complete ?? j?.workToComplete),
  notes: str(j?.notes),
  status: (j?.status as Job['status']) || 'scheduled',
  jobType: (j?.job_type ?? j?.jobType) as Job['jobType'] || 'assessment',
  hourlyRate: num(j?.hourly_rate ?? j?.hourlyRate),
  totalCost: num(j?.total_cost ?? j?.totalCost),
  assignedTo: arr<string>(j?.assigned_to ?? j?.assignedTo),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  siteId: j?.site_id ?? j?.siteId ?? undefined,
});

export const toDbJob = (j: Job): Record<string, any> => ({
  id: j.id,
  site_id: j.siteId ?? null,
  title: str(j.title),
  client_name: str(j.clientName),
  location: str(j.location),
  date: j.date,
  start_time: str(j.startTime),
  end_time: str(j.endTime),
  time_spent: num(j.timeSpent),
  work_completed: str(j.workCompleted),
  work_to_complete: str(j.workToComplete),
  notes: str(j.notes),
  status: j.status || 'scheduled',
  job_type: j.jobType || 'assessment',
  hourly_rate: num(j.hourlyRate),
  total_cost: num(j.totalCost),
  assigned_to: arr<string>(j.assignedTo),
  updated_at: nowIso(),
});

// ---- Site -----------------------------------------------------------------
export const fromDbSite = (s: any): Site => ({
  id: str(s?.id) || crypto.randomUUID(),
  name: str(s?.name),
  description: str(s?.description),
  address: str(s?.address),
  clientName: str(s?.client_name ?? s?.clientName),
  clientPhone: str(s?.client_phone ?? s?.clientPhone),
  clientEmail: str(s?.client_email ?? s?.clientEmail),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbSite = (s: Site): Record<string, any> => ({
  id: s.id,
  name: str(s.name),
  description: str(s.description),
  address: str(s.address),
  client_name: str(s.clientName),
  client_phone: str(s.clientPhone),
  client_email: str(s.clientEmail),
  updated_at: nowIso(),
});

// ---- Quote ----------------------------------------------------------------
export const fromDbQuote = (q: any): Quote => ({
  id: str(q?.id) || crypto.randomUUID(),
  clientName: str(q?.client_name ?? q?.clientName),
  address: str(q?.address),
  mobile: str(q?.mobile),
  siteContact: str(q?.site_contact ?? q?.siteContact),
  scheduledDate: str(q?.scheduled_date ?? q?.scheduledDate) || nowIso().split('T')[0],
  scheduledTime: str(q?.scheduled_time ?? q?.scheduledTime) || '09:00',
  jobDescription: (() => {
    const list = arr<any>(q?.job_description ?? q?.jobDescription);
    return list.length ? list : [{ id: crypto.randomUUID(), description: '' }];
  })(),
  additionalEquipment: str(q?.additional_equipment ?? q?.additionalEquipment),
  accessParking: str(q?.access_parking ?? q?.accessParking),
  status: (q?.status as Quote['status']) || 'new',
  archived: Boolean(q?.archived),
  assignedTo: arr<string>(q?.assigned_to ?? q?.assignedTo),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbQuote = (q: Quote): Record<string, any> => ({
  id: q.id,
  client_name: str(q.clientName),
  address: str(q.address),
  mobile: str(q.mobile),
  site_contact: str(q.siteContact),
  scheduled_date: q.scheduledDate,
  scheduled_time: q.scheduledTime,
  job_description: q.jobDescription ?? [],
  additional_equipment: str(q.additionalEquipment),
  access_parking: str(q.accessParking),
  status: q.status || 'new',
  archived: Boolean(q.archived),
  assigned_to: arr<string>(q.assignedTo),
  updated_at: nowIso(),
});

// ---- Daily Risk -----------------------------------------------------------
export const fromDbRisk = (r: any): DailyRisk => ({
  id: str(r?.id) || crypto.randomUUID(),
  siteAddress: str(r?.site_address ?? r?.siteAddress),
  date: str(r?.date) || nowIso().split('T')[0],
  clientName: str(r?.client_name ?? r?.clientName),
  clientMobile: str(r?.client_mobile ?? r?.clientMobile),
  firstAidLocation: str(r?.first_aid_location ?? r?.firstAidLocation),
  nearestHospital: str(r?.nearest_hospital ?? r?.nearestHospital),
  hazards: (r?.hazards && typeof r.hazards === 'object') ? r.hazards : {},
  hazardControls: arr(r?.hazard_controls ?? r?.hazardControls),
  signatures: arr(r?.signatures),
  createdAt: Date.now(),
  updatedAt: Date.now(),
} as DailyRisk);

export const toDbRisk = (r: DailyRisk): Record<string, any> => ({
  id: r.id,
  site_address: str(r.siteAddress),
  date: r.date,
  client_name: str(r.clientName),
  client_mobile: str(r.clientMobile),
  first_aid_location: str(r.firstAidLocation),
  nearest_hospital: str(r.nearestHospital),
  hazards: r.hazards ?? {},
  hazard_controls: r.hazardControls ?? [],
  signatures: r.signatures ?? [],
  updated_at: nowIso(),
});

// ---- Chlorophyll ----------------------------------------------------------
export const fromDbChlorophyll = (c: any): ChlorophyllReading => ({
  id: str(c?.id) || crypto.randomUUID(),
  treeId: str(c?.tree_id ?? c?.treeId) || crypto.randomUUID(),
  treeSpecies: str(c?.tree_species ?? c?.treeSpecies),
  treeLocation: str(c?.tree_location ?? c?.treeLocation),
  treeMaturity: (c?.tree_maturity ?? c?.treeMaturity) as ChlorophyllReading['treeMaturity'] || 'Juvenile',
  date: str(c?.date) || nowIso().split('T')[0],
  chlorophyllLevel: num(c?.chlorophyll_level ?? c?.chlorophyllLevel),
  extensionGrowth: num(c?.extension_growth ?? c?.extensionGrowth),
  notes: str(c?.notes),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbChlorophyll = (c: ChlorophyllReading): Record<string, any> => ({
  id: c.id,
  tree_id: c.treeId,
  tree_species: str(c.treeSpecies),
  tree_location: str(c.treeLocation),
  tree_maturity: c.treeMaturity || 'Juvenile',
  date: c.date,
  chlorophyll_level: num(c.chlorophyllLevel),
  extension_growth: num(c.extensionGrowth),
  notes: str(c.notes),
  updated_at: nowIso(),
});
