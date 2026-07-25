export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface Lead {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  ai_score: number | null;
  ai_category: 'Hot' | 'Warm' | 'Cold' | null;
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
