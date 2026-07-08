export interface TreeData {
  treeNumber: string;
  species: string;
  commonName: string;
  dbh: number; // Diameter at breast height in cm
  height: number; // Height in meters
  canopySpreadNS: number; // North to South canopy spread in meters
  canopySpreadEW: number; // East to West canopy spread in meters
  treeHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  extensionGrowth: number; // Extension growth in millimeters
  structure: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  woundWoodDevelopment: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  canopyCover: number; // Canopy cover percentage
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  category: 'overview' | 'trunk' | 'crown' | 'roots' | 'damage' | 'other';
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'observation' | 'recommendation' | 'safety' | 'treatment' | 'other';
  timestamp: number;
}

export interface ArboristReport {
  id: string;
  title: string;
  clientName: string;
  address: string;
  inspector: string;
  date: string;
  treeData: TreeData;
  photos: Photo[];
  notes: Note[];
  recommendations: string[];
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  siteId?: string; // Link to site if part of a site registry
}

export interface Site {
  id: string;
  name: string;
  description: string;
  address: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface ChlorophyllReading {
  id: string;
  treeId: string; // Unique identifier for the tree being monitored
  treeSpecies: string;
  treeLocation: string;
  treeMaturity: 'Juvenile' | 'Semi mature' | 'Mature' | 'Senescent';
  date: string;
  chlorophyllLevel: number;
  extensionGrowth: number; // Extension growth in mm
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Job {
  id: string;
  title: string;
  clientName: string;
  location: string;
  date: string;
  startTime?: string;
  endTime?: string;
  timeSpent: number; // Time in minutes
  workCompleted: string;
  workToComplete: string;
  notes: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  jobType: 'assessment' | 'pruning' | 'removal' | 'treatment' | 'consultation' | 'emergency' | 'other';
  hourlyRate?: number;
  totalCost?: number;
  assignedTo: string[]; // team_members.id values
  createdAt: number;
  updatedAt: number;
  siteId?: string; // Link to site if part of a site
  deletedAt?: number;
}

export interface HazardControl {
  id: string;
  hazardIdentified: string;
  controlMeasures: string;
}

export interface Signature {
  id: string;
  name: string;
  timestamp: number;
}

export interface DailyRisk {
  id: string;
  siteAddress: string;
  date: string;
  clientName: string;
  clientMobile: string;
  firstAidLocation: string;
  nearestHospital: string;
  hazards: {
    workingAtHeights: boolean;
    unstableGround: boolean;
    powerlines: boolean;
    undergroundServices: boolean;
    siteWorkers: boolean;
    pedestrians: boolean;
    traffic: boolean;
    noise: boolean;
    chainsaws: boolean;
    loweringDevices: boolean;
    ewp: boolean;
    crane: boolean;
    deadBranches: boolean;
    brokenBranches: boolean;
    deadTree: boolean;
    barkInclusions: boolean;
    treeLean: boolean;
    fallenTree: boolean;
    wildlife: boolean;
  };
  hazardControls: HazardControl[];
  signatures: Signature[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface LineItem {
  id: string;
  description: string;
}

export interface Quote {
  id: string;
  clientName: string;
  address: string;
  mobile: string;
  siteContact: string;
  scheduledDate: string;
  scheduledTime: string;
  jobDescription: LineItem[];
  additionalEquipment: string;
  accessParking: string;
  status: 'new' | 'scheduled' | 'completed';
  archived: boolean;
  assignedTo: string[]; // team_members.id values
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: number;
  lastLogin: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isGuest: boolean;
}

export interface EmailQuoteRequest {
  id: string;
  from: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  receivedAt: number;
  processed: boolean;
  extractedQuote?: Quote;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  size: number;
}