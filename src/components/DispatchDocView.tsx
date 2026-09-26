import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  FileDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  PackageCheck
} from 'lucide-react';
import { TripDispatch } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { SkeletonTable } from './common/SkeletonLoader';

interface DispatchDocViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onCreateMF: (trip: TripDispatch) => void;
  isOpenDocModal?: boolean;
  setIsOpenDocModal?: (open: boolean) => void;
  selectedTripForDoc?: TripDispatch | null;
}

export const DispatchDocView: React.FC<DispatchDocViewProps> = ({
  store,
  themeStyles,
  onCreateMF,
  isOpenDocModal: externalIsOpen,
  setIsOpenDocModal: externalSetIsOpen,
  selectedTripForDoc
}) => {
  const { trips } = store.state;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const isOpenModal = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpenModal = externalSetIsOpen || setInternalIsOpen;

  // Form State
  const [docForm, setDocForm] = useState<{
    so_id: number;
    loading_date: string;
    gc_no: string;
    invoice_no: string;
    eway_bill_no: string;
    eway_expiry: string;
    destination_gc: string;
    items: string;
    pkgs: string;
    articles: string;
    final_mt: number;
  }>({
    so_id: selectedTripForDoc?.so_id || trips[0]?.so_id || 1,
    loading_date: new Date().toISOString().split('T')[0],
    gc_no: '',
    invoice_no: '',
    eway_bill_no: '',
    eway_expiry: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    destination_gc: '',
    items: 'Steel Billets / TMT Bars',
    pkgs: '12 Bundles',
    articles: 'Structural Cargo',
    final_mt: 25.0
  });

  const handleOpenDocModal = (trip?: TripDispatch) => {
    const target = trip || selectedTripForDoc || trips[0];
    if (!target) return;

    setDocForm({
      so_id: target.so_id,
      loading_date: target.loading_date || new Date().toISOString().split('T')[0],
      gc_no: target.gc_no || `GC-${Math.floor(10000 + Math.random() * 90000)}`,
      invoice_no: target.invoice_no || `INV-2025-${Math.floor(100 + Math.random() * 900)}`,
      eway_bill_no: target.eway_bill_no || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      eway_expiry: target.eway_expiry || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      destination_gc: target.destination_gc || target.destination || '',
      items: target.items || 'Cold Rolled Steel Coils',
      pkgs: target.pkgs || '6 Coils',
      articles: target.articles || 'Heavy Coils',
      final_mt: target.final_mt || 28.5
    });
    setIsOpenModal(true);
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveDispatch({
      ...docForm,
      final_mt: Number(docForm.final_mt)
    });
    setIsOpenModal(false);
  };

  // E-Way Bill Expiry helper
  const getEwayStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (diffDays <= 2) {
      return { label: `Expires in ${diffDays}d`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { label: `Valid (${diffDays}d left)`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  // Filtering
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch =
        (t.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.gc_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.invoice_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.eway_bill_no || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterMode === 'ALL' || t.dispatch_status === filterMode;

      return matchesSearch && matchesFilter;
    });
  }, [trips, searchTerm, filterMode]);

  // Paginated dataset (Indexing without load)
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, currentPage, pageSize]);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Dispatch & Documentation Master (GC / Bilty)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <strong>Stage 2 of 2:</strong> Register weighbridge tonnage, GC/Bilty Number, Tax Invoice, and E-Way Bill compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(trips, 'SFMPL_Dispatch_Documentation')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => handleOpenDocModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Generate GC & Dispatch</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search GC No, Invoice #, E-Way Bill, Lorry..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
            />
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => { setFilterMode('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({trips.length})
            </button>
            <button
              onClick={() => { setFilterMode('DISPATCHED'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'DISPATCHED' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gate-Out Dispatched ({trips.filter(t => t.dispatch_status === 'DISPATCHED').length})
            </button>
            <button
              onClick={() => { setFilterMode('PENDING'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'PENDING' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending GC ({trips.filter(t => t.dispatch_status === 'PENDING').length})
            </button>
          </div>
        </div>
      </div>

      {/* Dispatch Table */}
      {isLoading ? (
        <SkeletonTable rows={pageSize} cols={8} themeStyles={themeStyles} />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">GC / BILTY & LORRY</th>
                  <th className="py-3 px-4 font-semibold">LOADING DATE</th>
                  <th className="py-3 px-4 font-semibold">INVOICE & E-WAY BILL</th>
                  <th className="py-3 px-4 font-semibold">E-WAY EXPIRY</th>
                  <th className="py-3 px-4 font-semibold text-right">WEIGHBRIDGE MT</th>
                  <th className="py-3 px-4 font-semibold">ITEMS & ARTICLES</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileText className="h-8 w-8 mx-auto opacity-40 mb-2" />
                      <p className="text-sm font-medium">No dispatch documentation records found</p>
                      <p className="text-xs text-slate-500 mt-1">Select an allocated vehicle to generate its GC and E-way bill</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((trip, idx) => {
                    const ewayBadge = getEwayStatus(trip.eway_expiry);
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={trip.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                          {rowIndex}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono text-sm">
                            {trip.gc_no || <span className="text-amber-400 text-xs italic">Pending GC</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {trip.lorry_no} • <span className="text-blue-400">{trip.so_number}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {fmtDate(trip.loading_date || trip.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-200">{trip.invoice_no || '—'}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            EWB: {trip.eway_bill_no || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {ewayBadge ? (
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${ewayBadge.color}`}>
                              {ewayBadge.label}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                          {trip.final_mt ? `${trip.final_mt} MT` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-300 font-medium truncate max-w-[150px]">{trip.items || 'General Steel'}</div>
                          <div className="text-[10px] text-slate-400">{trip.pkgs || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {trip.dispatch_status === 'DISPATCHED' ? (
                            <button
                              onClick={() => onCreateMF(trip)}
                              className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="Create Money Freight"
                            >
                              <span>Create MF</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDocModal(trip)}
                              className="px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Dispatch</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationControl
            currentPage={currentPage}
            totalItems={filteredTrips.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            themeStyles={themeStyles}
          />
        </div>
      )}

      {/* Documentation Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Dispatch & Cargo Documentation (GC / Bilty)
                </h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Allocated Lorry *</label>
                <select
                  value={docForm.so_id}
                  onChange={e => {
                    const soId = Number(e.target.value);
                    const target = trips.find(t => t.so_id === soId);
                    setDocForm({
                      ...docForm,
                      so_id: soId,
                      destination_gc: target?.destination || ''
                    });
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                >
                  {trips.map(t => (
                    <option key={t.id} value={t.so_id}>
                      {t.lorry_no} — {t.so_number} ({t.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Date *</label>
                  <input
                    type="date"
                    value={docForm.loading_date}
                    onChange={e => setDocForm({ ...docForm, loading_date: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GC / Bilty Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. GC-SF-88514"
                    value={docForm.gc_no}
                    onChange={e => setDocForm({ ...docForm, gc_no: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tax Invoice Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-JSW-2025-442"
                    value={docForm.invoice_no}
                    onChange={e => setDocForm({ ...docForm, invoice_no: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Final Loaded MT (Weighbridge) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.50"
                    value={docForm.final_mt}
                    onChange={e => setDocForm({ ...docForm, final_mt: Number(e.target.value) })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono font-bold ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-Way Bill Number (12 Digits)</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="293847561029"
                    value={docForm.eway_bill_no}
                    onChange={e => setDocForm({ ...docForm, eway_bill_no: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-Way Bill Expiry Date</label>
                  <input
                    type="date"
                    value={docForm.eway_expiry}
                    onChange={e => setDocForm({ ...docForm, eway_expiry: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Material / Items</label>
                  <input
                    type="text"
                    value={docForm.items}
                    onChange={e => setDocForm({ ...docForm, items: e.target.value })}
                    className={`w-full rounded px-2.5 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Packages</label>
                  <input
                    type="text"
                    value={docForm.pkgs}
                    onChange={e => setDocForm({ ...docForm, pkgs: e.target.value })}
                    className={`w-full rounded px-2.5 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Articles</label>
                  <input
                    type="text"
                    value={docForm.articles}
                    onChange={e => setDocForm({ ...docForm, articles: e.target.value })}
                    className={`w-full rounded px-2.5 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 shadow-xs"
                >
                  Confirm Gate-Out Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
