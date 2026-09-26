import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileDown,
  Upload,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Edit2,
  Phone,
  Building2,
  Clock
} from 'lucide-react';
import { TripDispatch, SalesOrder } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { SkeletonTable } from './common/SkeletonLoader';

interface VehicleAllocationViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onProceedToDispatch: (trip: TripDispatch) => void;
  allocatedSOForModal?: SalesOrder | null;
  isOpenAllocModal: boolean;
  setIsOpenAllocModal: (open: boolean) => void;
  onOpenImport: () => void;
}

export const VehicleAllocationView: React.FC<VehicleAllocationViewProps> = ({
  store,
  themeStyles,
  onProceedToDispatch,
  allocatedSOForModal,
  isOpenAllocModal,
  setIsOpenAllocModal,
  onOpenImport
}) => {
  const { trips, salesOrders, brokers, places, parties } = store.state;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [allocForm, setAllocForm] = useState<{
    id?: number;
    so_id: number;
    lorry_no: string;
    allocation_date: string;
    consignor: string;
    consignee: string;
    destination: string;
    broker_id: number | null;
    broker_acc: string;
    broker_ifsc: string;
    bal_acc: string;
    bal_ifsc: string;
    broker_contact: string;
    driver_contact: string;
  }>({
    so_id: salesOrders[0]?.id || 1,
    lorry_no: '',
    allocation_date: new Date().toISOString().split('T')[0],
    consignor: '',
    consignee: '',
    destination: '',
    broker_id: brokers[0]?.id || null,
    broker_acc: brokers[0]?.primary_acc_no || '',
    broker_ifsc: brokers[0]?.ifsc || '',
    bal_acc: brokers[0]?.secondary_acc_no || '',
    bal_ifsc: brokers[0]?.secondary_ifsc || '',
    broker_contact: brokers[0]?.contact_no || '',
    driver_contact: ''
  });

  const handleBrokerChange = (brokerId: number | null) => {
    const b = brokers.find(item => item.id === brokerId);
    setAllocForm(prev => ({
      ...prev,
      broker_id: brokerId,
      broker_acc: b?.primary_acc_no || '',
      broker_ifsc: b?.ifsc || '',
      bal_acc: b?.secondary_acc_no || '',
      bal_ifsc: b?.secondary_ifsc || '',
      broker_contact: b?.contact_no || ''
    }));
  };

  const handleOpenAlloc = (targetSO?: SalesOrder) => {
    const so = targetSO || allocatedSOForModal || salesOrders.find(s => !s.allocated) || salesOrders[0];
    const p = parties.find(party => party.id === so?.party_id);
    const f = places.find(place => place.id === so?.from_id);
    const t = places.find(place => place.id === so?.to_id);
    const b = brokers[0];

    setAllocForm({
      so_id: so ? so.id : 1,
      lorry_no: '',
      allocation_date: new Date().toISOString().split('T')[0],
      consignor: `${p?.party_name || 'Client'} (${f?.place_name || ''})`,
      consignee: `${t?.place_name || 'Warehouse'}`,
      destination: t?.place_name || '',
      broker_id: b?.id || null,
      broker_acc: b?.primary_acc_no || '',
      broker_ifsc: b?.ifsc || '',
      bal_acc: b?.secondary_acc_no || '',
      bal_ifsc: b?.secondary_ifsc || '',
      broker_contact: b?.contact_no || '',
      driver_contact: ''
    });
    setIsOpenAllocModal(true);
  };

  const handleSaveAlloc = (e: React.FormEvent) => {
    e.preventDefault();
    const so = salesOrders.find(s => s.id === allocForm.so_id);
    store.saveTrip({
      ...allocForm,
      so_number: so?.so_number || `SO-${allocForm.so_id}`
    });
    setIsOpenAllocModal(false);
  };

  // Filtered dataset
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch =
        (t.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.consignor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.driver_contact || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || t.dispatch_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchTerm, statusFilter]);

  // Paginated dataset (Indexing without load)
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, currentPage, pageSize]);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner explaining difference */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Vehicle Allocation Master
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <strong>Stage 1 of 2:</strong> Assign lorries, drivers, and transporters to confirmed Sales Orders before yard gate-in.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Allocations</span>
          </button>
          <button
            onClick={() => exportToExcel(trips, 'SFMPL_Vehicle_Allocations')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => handleOpenAlloc()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Allocate Vehicle</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Lorry No, SO #, consignor, driver phone..."
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
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({trips.length})
            </button>
            <button
              onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'PENDING' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending Yard Gate-in ({trips.filter(t => t.dispatch_status === 'PENDING').length})
            </button>
            <button
              onClick={() => { setStatusFilter('DISPATCHED'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'DISPATCHED' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispatched ({trips.filter(t => t.dispatch_status === 'DISPATCHED').length})
            </button>
          </div>
        </div>
      </div>

      {/* Allocation Table with Indexing */}
      {isLoading ? (
        <SkeletonTable rows={pageSize} cols={7} themeStyles={themeStyles} />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">LORRY & SO #</th>
                  <th className="py-3 px-4 font-semibold">ALLOCATION DATE</th>
                  <th className="py-3 px-4 font-semibold">CONSIGNOR & ROUTE</th>
                  <th className="py-3 px-4 font-semibold">TRANSPORTER / BROKER</th>
                  <th className="py-3 px-4 font-semibold">DRIVER CONTACT</th>
                  <th className="py-3 px-4 font-semibold text-center">STAGE STATUS</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Truck className="h-8 w-8 mx-auto opacity-40 mb-2" />
                      <p className="text-sm font-medium">No vehicle allocations found</p>
                      <p className="text-xs text-slate-500 mt-1">Assign a lorry to a confirmed Sales Order to begin</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((trip, idx) => {
                    const broker = brokers.find(b => b.id === trip.broker_id);
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={trip.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                          {rowIndex}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 text-sm font-mono">{trip.lorry_no}</div>
                          <div className="font-mono text-blue-400 text-[11px] mt-0.5">{trip.so_number}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {fmtDate(trip.allocation_date || trip.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{trip.consignor}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">→ {trip.destination || trip.consignee}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{broker?.broker_name || 'Direct Broker'}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            A/C: {trip.broker_acc || broker?.primary_acc_no || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-200 font-semibold">{trip.driver_contact || '—'}</div>
                          <div className="text-[10px] text-slate-400">Broker Ph: {trip.broker_contact || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            trip.dispatch_status === 'DISPATCHED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {trip.dispatch_status === 'DISPATCHED' ? 'Gate-Out Dispatched' : 'Allocated (Pending GC)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onProceedToDispatch(trip)}
                            className="px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                            title="Open Documentation & GC Dispatch Stage"
                          >
                            <span>Documentation</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Client-side Indexing & Pagination */}
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

      {/* Allocation Modal */}
      {isOpenAllocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Allocate Vehicle & Driver
                </h3>
              </div>
              <button
                onClick={() => setIsOpenAllocModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAlloc} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Sales Order *</label>
                <select
                  value={allocForm.so_id}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const so = salesOrders.find(s => s.id === id);
                    const p = parties.find(party => party.id === so?.party_id);
                    const f = places.find(place => place.id === so?.from_id);
                    const t = places.find(place => place.id === so?.to_id);
                    setAllocForm({
                      ...allocForm,
                      so_id: id,
                      consignor: `${p?.party_name || 'Client'} (${f?.place_name || ''})`,
                      consignee: `${t?.place_name || ''} Depot`,
                      destination: t?.place_name || ''
                    });
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                >
                  {salesOrders.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.so_number || `SO-${s.id}`} — {s.mt} MT ({s.allocated ? 'Allocated' : 'Unallocated'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lorry Registration No *</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-04-GP-8821"
                    value={allocForm.lorry_no}
                    onChange={e => setAllocForm({ ...allocForm, lorry_no: e.target.value.toUpperCase() })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Contact Number *</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={allocForm.driver_contact}
                    onChange={e => setAllocForm({ ...allocForm, driver_contact: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transporter / Broker *</label>
                <select
                  value={allocForm.broker_id || ''}
                  onChange={e => handleBrokerChange(e.target.value ? Number(e.target.value) : null)}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                >
                  {brokers.map(b => (
                    <option key={b.id} value={b.id}>{b.broker_name}</option>
                  ))}
                </select>
              </div>

              {/* Bank Details */}
              <div className="p-3 rounded-lg border border-white/5 bg-black/20 space-y-2">
                <div className="text-[11px] font-semibold text-blue-400">Advance Bank Account (Disbursements)</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">Account No</label>
                    <input
                      type="text"
                      value={allocForm.broker_acc}
                      onChange={e => setAllocForm({ ...allocForm, broker_acc: e.target.value })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">IFSC Code</label>
                    <input
                      type="text"
                      value={allocForm.broker_ifsc}
                      onChange={e => setAllocForm({ ...allocForm, broker_ifsc: e.target.value.toUpperCase() })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Consignor (Pickup Origin)</label>
                  <input
                    type="text"
                    value={allocForm.consignor}
                    onChange={e => setAllocForm({ ...allocForm, consignor: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Destination</label>
                  <input
                    type="text"
                    value={allocForm.destination}
                    onChange={e => setAllocForm({ ...allocForm, destination: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpenAllocModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-xs"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
