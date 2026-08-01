export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

/** Enum de clasificación de lead. `value` canónico; el label visible se deriva aparte. */
export type LeadCategory = 'HOT' | 'WARM' | 'COLD';

export const LEAD_CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
];

export const LEAD_CATEGORY_LABEL: Record<LeadCategory, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
};

export interface Lead {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  ai_score: number | null;
  /** Clasificación. Canónico en mayúsculas: es lo que n8n escribe en la columna. */
  ai_category: LeadCategory | null;
  /** Sector de negocio. Texto libre emitido por el LLM, no un enum cerrado. */
  ai_business_category: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

export interface LeadStats {
  total: number;
  new: number;
  hot: number;
  warm: number;
  cold: number;
  avg_score: number;
  today: number;
}

export interface LeadLogEntry {
  id: number;
  email: string;
  name: string | null;
  source: string;
  status: string;
  ai_score: number | null;
  created_at: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

export interface Subscription {
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_end: string;
}

export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiUsage {
  total: number;
  by_endpoint: Record<string, number>;
  period: { from: string; to: string };
}
