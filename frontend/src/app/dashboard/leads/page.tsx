'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import type { Lead } from '@/lib/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter) params.category = filter;
    if (search) params.search = search;

    leadsApi.list(params)
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, search]);

  const categoryColor = (cat: string | null) => {
    switch (cat) {
      case 'Hot': return 'bg-red-100 text-red-800';
      case 'Warm': return 'bg-yellow-100 text-yellow-800';
      case 'Cold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leads</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, email o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="">Todas las categorías</option>
          <option value="Hot">Hot</option>
          <option value="Warm">Warm</option>
          <option value="Cold">Cold</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay leads aún</p>
          <p className="text-gray-400 text-sm mt-1">Los leads capturados por el webhook aparecerán aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Empresa</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Score</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Categoría</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{lead.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.company || '-'}</td>
                    <td className="px-4 py-3 text-sm">{lead.ai_score ?? '-'}</td>
                    <td className="px-4 py-3">
                      {lead.ai_category && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColor(lead.ai_category)}`}>
                          {lead.ai_category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
