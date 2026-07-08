import { ArboristReport, ChlorophyllReading, Site, Job, DailyRisk, Quote } from '../types';

const REPORTS_STORAGE_KEY = 'arborist-reports';
const SITES_STORAGE_KEY = 'arborist-sites';
const JOBS_STORAGE_KEY = 'arborist-jobs';
const CHLOROPHYLL_STORAGE_KEY = 'chlorophyll-readings';
const DAILY_RISK_STORAGE_KEY = 'daily-risk-assessments';
const QUOTES_STORAGE_KEY = 'quotes';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const saveReports = (reports: ArboristReport[]): void => {
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
};

export const loadReports = (): ArboristReport[] => {
  const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
  const allReports = stored ? JSON.parse(stored) : [];
  return allReports.filter((report: ArboristReport) => !report.deletedAt);
};

// New functions to load ALL items (including soft-deleted ones, for the RecentlyDeleted component)
const loadAllItemsForKey = (key: string): any[] => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const saveChlorophyllReadings = (readings: ChlorophyllReading[]): void => {
  localStorage.setItem(CHLOROPHYLL_STORAGE_KEY, JSON.stringify(readings));
};

export const loadChlorophyllReadings = (): ChlorophyllReading[] => {
  const stored = localStorage.getItem(CHLOROPHYLL_STORAGE_KEY);
  const allReadings = stored ? JSON.parse(stored) : [];
  return allReadings.filter((reading: ChlorophyllReading) => !reading.deletedAt);
};

export const getAllRawReports = (): ArboristReport[] => loadAllItemsForKey(REPORTS_STORAGE_KEY);
export const getAllRawChlorophyllReadings = (): ChlorophyllReading[] => loadAllItemsForKey(CHLOROPHYLL_STORAGE_KEY);

export const saveSites = (sites: Site[]): void => {
  localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(sites));
};

export const loadSites = (): Site[] => {
  const stored = localStorage.getItem(SITES_STORAGE_KEY);
  const allSites = stored ? JSON.parse(stored) : [];
  return allSites.filter((site: Site) => !site.deletedAt);
};
export const getAllRawSites = (): Site[] => loadAllItemsForKey(SITES_STORAGE_KEY);

export const saveJobs = (jobs: Job[]): void => {
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
};

export const loadJobs = (): Job[] => {
  const stored = localStorage.getItem(JOBS_STORAGE_KEY);
  const allJobs = stored ? JSON.parse(stored) : [];
  return allJobs.filter((job: Job) => !job.deletedAt);
};
export const getAllRawJobs = (): Job[] => loadAllItemsForKey(JOBS_STORAGE_KEY);

export const saveDailyRisks = (risks: DailyRisk[]): void => {
  localStorage.setItem(DAILY_RISK_STORAGE_KEY, JSON.stringify(risks));
};

export const loadDailyRisks = (): DailyRisk[] => {
  const stored = localStorage.getItem(DAILY_RISK_STORAGE_KEY);
  const allRisks = stored ? JSON.parse(stored) : [];
  return allRisks.filter((risk: DailyRisk) => !risk.deletedAt);
};
export const getAllRawDailyRisks = (): DailyRisk[] => loadAllItemsForKey(DAILY_RISK_STORAGE_KEY);

export const saveQuotes = (quotes: Quote[]): void => {
  localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
};

export const loadQuotes = (): Quote[] => {
  const stored = localStorage.getItem(QUOTES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

// New functions to recover items
const recoverItemGeneric = (key: string, id: string) => {
  const items = loadAllItemsForKey(key); // Load all, including soft-deleted
  const itemToRecover = items.find((item: any) => item.id === id);
  if (itemToRecover) {
    delete itemToRecover.deletedAt; // Remove the deletedAt timestamp
    localStorage.setItem(key, JSON.stringify(items));
  }
};

export const recoverReport = (id: string) => recoverItemGeneric(REPORTS_STORAGE_KEY, id);
export const recoverChlorophyllReading = (id: string) => recoverItemGeneric(CHLOROPHYLL_STORAGE_KEY, id);
export const recoverSite = (id: string) => recoverItemGeneric(SITES_STORAGE_KEY, id);
export const recoverJob = (id: string) => recoverItemGeneric(JOBS_STORAGE_KEY, id);
export const recoverDailyRisk = (id: string) => recoverItemGeneric(DAILY_RISK_STORAGE_KEY, id);

// Function to purge old deleted items
export const purgeOldDeletedItems = () => {
  const now = Date.now();

  // Helper to process a single storage key
  const processStorageKey = (key: string) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      let items = JSON.parse(stored);
      const updatedItems = items.filter((item: any) => {
        // Keep items that are not deleted, or deleted within the last 7 days
        return !item.deletedAt || (now - item.deletedAt < SEVEN_DAYS_IN_MS);
      });
      if (updatedItems.length !== items.length) {
        localStorage.setItem(key, JSON.stringify(updatedItems));
      }
    }
  };

  processStorageKey(REPORTS_STORAGE_KEY);
  processStorageKey(CHLOROPHYLL_STORAGE_KEY);
  processStorageKey(SITES_STORAGE_KEY);
  processStorageKey(JOBS_STORAGE_KEY);
  processStorageKey(DAILY_RISK_STORAGE_KEY);
};

export const generateReportId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

export const createEmptyReport = (siteId?: string): ArboristReport => ({
  id: generateReportId(),
  title: '',
  clientName: '',
  address: '',
  inspector: '',
  date: new Date().toISOString().split('T')[0],
  treeData: {
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
    location: ''
  },
  photos: [],
  notes: [],
  recommendations: [],
  status: 'draft',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  siteId
});

export const createEmptyChlorophyllReading = (): ChlorophyllReading => ({
  id: generateReportId(),
  treeId: generateReportId(), // Generate unique tree ID for new readings
  treeSpecies: '',
  treeLocation: '',
  treeMaturity: 'Juvenile',
  date: new Date().toISOString().split('T')[0],
  chlorophyllLevel: 0,
  extensionGrowth: 0,
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const createEmptySite = (): Site => ({
  id: generateReportId(),
  name: '',
  description: '',
  address: '',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const createEmptyJob = (siteId?: string): Job => ({
  id: generateReportId(),
  title: '',
  clientName: '',
  location: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '',
  endTime: '',
  timeSpent: 0,
  workCompleted: '',
  workToComplete: '',
  notes: '',
  status: 'scheduled',
  jobType: 'assessment',
  hourlyRate: 0,
  totalCost: 0,
  assignedTo: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  siteId
});

export const createEmptyDailyRisk = (): DailyRisk => ({
  id: generateReportId(),
  siteAddress: '',
  date: new Date().toISOString().split('T')[0],
  clientName: '',
  clientMobile: '',
  firstAidLocation: '',
  nearestHospital: '',
  hazards: {
    workingAtHeights: false,
    unstableGround: false,
    powerlines: false,
    undergroundServices: false,
    siteWorkers: false,
    pedestrians: false,
    traffic: false,
    noise: false,
    chainsaws: false,
    loweringDevices: false,
    ewp: false,
    crane: false,
    deadBranches: false,
    brokenBranches: false,
    deadTree: false,
    barkInclusions: false,
    treeLean: false,
    fallenTree: false,
    wildlife: false
  },
  hazardControls: [],
  signatures: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const createEmptyQuote = (): Quote => ({
  id: generateReportId(),
  clientName: '',
  address: '',
  mobile: '',
  siteContact: '',
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: '09:00',
  jobDescription: [{ id: generateReportId(), description: '' }],
  additionalEquipment: '',
  accessParking: '',
  status: 'new',
  archived: false,
  assignedTo: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});