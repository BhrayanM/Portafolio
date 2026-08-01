'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABEL } from '@/lib/types';
import type { Lead, LeadCategory } from '@/lib/types';
import { Globe, Smartphone, Mail, Link, Search, Filter, Users } from 'lucide-react';

const DEMO_LEADS: Lead[] = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@acme.com', company: 'Acme Inc', phone: '+1 (555) 123-4567', source: 'webhook', ai_score: 87, ai_category: 'HOT', ai_business_category: 'Technology', status: 'New', message: 'Interested in lead automation', created_at: '2026-07-25T10:30:00Z' },
  { id: 2, name: 'David Kim', email: 'david@innovate.io', company: 'Innovate.io', phone: '+1 (555) 876-5432', source: 'api', ai_score: 65, ai_category: 'WARM', ai_business_category: 'Fintech', status: 'Contacted', message: 'Requested a product demo', created_at: '2026-07-24T15:20:00Z' },
  { id: 3, name: 'Emily Rodriguez', email: 'emily@bluegrassbuild.com', company: 'Bluegrass Construction', phone: '+1 (502) 234-5678', source: 'webhook', ai_score: 42, ai_category: 'COLD', ai_business_category: 'Construction', status: 'New', message: 'Limited budget, exploring options', created_at: '2026-07-24T09:15:00Z' },
  { id: 4, name: 'James Wilson', email: 'jwilson@globalcorp.com', company: 'GlobalCorp', phone: '+1 (312) 987-6543', source: 'api', ai_score: 91, ai_category: 'HOT', ai_business_category: 'Logistics', status: 'Following up', message: 'Urgent, needs a solution ASAP', created_at: '2026-07-23T14:00:00Z' },
  { id: 5, name: 'Priya Patel', email: 'priya@brightpath.io', company: 'BrightPath', phone: '+1 (415) 543-2109', source: 'manual', ai_score: 55, ai_category: 'WARM', ai_business_category: 'E-commerce', status: 'Qualified', message: 'Evaluating alternatives', created_at: '2026-07-22T11:45:00Z' },
  { id: 6, name: 'Michael Brown', email: 'michael@edunova.edu', company: 'EduNova', phone: '+1 (212) 109-8765', source: 'webhook', ai_score: 38, ai_category: 'COLD', ai_business_category: 'Education', status: 'New', message: 'Requested general information', created_at: '2026-07-21T16:30:00Z' },
  { id: 7, name: 'Rachel Adams', email: 'radams@techhub.com', company: 'TechHub', phone: '+1 (206) 567-1234', source: 'api', ai_score: 78, ai_category: 'HOT', ai_business_category: 'SaaS', status: 'Negotiating', message: 'Ready to sign the contract', created_at: '2026-07-20T08:00:00Z' },
  { id: 8, name: 'Chris Taylor', email: 'chris@boldagency.com', company: 'Bold Agency', phone: '+1 (305) 432-1876', source: 'manual', ai_score: 48, ai_category: 'WARM', ai_business_category: 'Marketing', status: 'Contacted', message: 'Interested in the Growth plan', created_at: '2026-07-19T13:20:00Z' },
];

const sourceIcon: Record<string, React.ElementType> = {
  webhook: Globe,
  api: Link,
  manual: Smartphone,
};

const sourceLabel: Record<string, string> = {
  webhook: 'Webhook',
  api: 'API',
  manual: 'Manual',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    const params: Record<string, string> = {};
    if (filter) params.category = filter;

    leadsApi.list(params)
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timer);
          setLeads(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error loading leads');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [filter]);

  const displayLeads = useDemo ? DEMO_LEADS : leads;

  const filteredLeads = displayLeads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(q)) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.company && lead.company.toLowerCase().includes(q))
    );
  });

  const categoryColor = (cat: LeadCategory | null) => {
    switch (cat) {
      case 'HOT': return 'bg-red-100 text-red-800';
      case 'WARM': return 'bg-yellow-100 text-yellow-800';
      case 'COLD': return 'bg-slate-100 text-slate-700';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">Manage the leads captured by the system</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Could not connect to the server. Showing demo data.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 bg-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 bg-white appearance-none"
          >
            <option value="">All categories</option>
            {LEAD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No leads yet</p>
          <p className="text-slate-400 text-sm mt-1">Leads captured by the webhook will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Lead</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Contact</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Source</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">AI Score</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Category</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Status</th>
                  <th className="text-left px-4 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => {
                  const SourceIcon = sourceIcon[lead.source || ''] || Mail;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-800">{lead.name || '-'}</p>
                        <p className="text-xs text-slate-500">{lead.company || '-'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-600">{lead.email}</p>
                        {lead.phone && (
                          <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <SourceIcon className="w-3.5 h-3.5" />
                          {sourceLabel[lead.source || ''] || lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {lead.ai_score !== null ? (
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                            lead.ai_score >= 70 ? 'text-red-600' : lead.ai_score >= 40 ? 'text-yellow-600' : 'text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              lead.ai_score >= 70 ? 'bg-red-500' : lead.ai_score >= 40 ? 'bg-yellow-500' : 'bg-slate-400'
                            }`} />
                            {lead.ai_score}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        {lead.ai_category && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColor(lead.ai_category)}`}>
                            {LEAD_CATEGORY_LABEL[lead.ai_category]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-600">{lead.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
