export interface DemoLead {
  id: string;
  companyName: string;
  category: string;
  city: string;
  country: string;
  websiteAvailable: boolean;
  phoneAvailable: boolean;
}

export type DataStatus = "demo";

export interface LeadList {
  id: string;
  name: string;
  createdAt: string;
  leadIds: string[];
  /** True for the built-in illustrative sample list. Sample lists are read-only. */
  isSample?: boolean;
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}
