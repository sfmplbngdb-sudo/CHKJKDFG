import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileCheck,
  FileDown,
  Building2,
  Calendar,
  CheckCircle2,
  Receipt,
  Edit2
} from 'lucide-react';
import { TripDispatch, SalesOrder } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtDate, exportToExcel } from '../utils/formatters';

interface TripDispatchViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  mode: 'allocation' | 'dispatch';
  onCreateMF: (trip: TripDispatch) => void;
  allocatedSOForModal?: SalesOrder | null;
  isOpenAllocModal: boolean;
  setIsOpenAllocModal: (open: boolean) => void;
}

export const TripDispatchView: React.FC<TripDispatchViewProps> = ({
  store,
  themeStyles,
  mode,
  onCreateMF,
  allocatedSOForModal,
  isOpenAllocModal,
  setIsOpenAllocModal
}) => {
  const { trips, salesOrders, brokers, places, parties } = store.state;
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDispatchModal, setIsOpenDispatchModal] = useState(false);
  const [activeTripForDispatch, setActiveTripForDispatch] = useState<TripDispatch | null>(null);

  // Allocation Form State
  const [allocForm, setAllocForm] = useState<{
    so_id: number;
    lorry_no: string;
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

  // Dispatch Documentation Form State
  const [dispatchForm, setDispatchForm] = useState<{
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
    loading_date: new Date().toISOString().split('T')[0],
    gc_no: `GC-SF-${Math.floor(10000 + Math.random() * 90000)}`,
    invoice_no: '',
    eway_bill_no: '',
    eway_expiry: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    destination_gc: '',
    items: 'Steel Materials / General Cargo',
    pkgs: '10 Bundles',
    articles: 'Standard Goods',
    final_mt: 28.5
  });

  // When broker changes in allocation modal, auto-fill bank accounts
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

  const handleOpenAlloc = (so?: SalesOrder) => {
    const targetSO = so || allocatedSOForModal || salesOrders.find(s => !s.allocated) || salesOrders[0];
    const party = parties.find(p => p.id === targetSO?.party_id);
    const fromP = places.find(p => p.id === targetSO?.from_id);
    const toP = places.find(p => p.id === targetSO?.to_id);
    const b = brokers[0];

    setAllocForm({
      so_id: targetSO ? targetSO.id : 1,
      lorry_no: '',
      consignor: `${party?.party_name || 'Client'} (${fromP?.place_name || 'Origin'})`,
      consignee: `${toP?.place_name || 'Destination Warehouse'}`,
      destination: toP?.place_name || '',
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

  const handleOpenDispatch = (trip: TripDispatch) => {
    setActiveTripForDispatch(trip);
    const so = salesOrders.find(s => s.id === trip.so_id);
    setDispatchForm({
      loading_date: trip.loading_date || new Date().toISOString().split('T')[0],
      gc_no: trip.gc_no || `GC-SF-${Math.floor(10000 + Math.random() * 90000)}`,
      invoice_no: trip.invoice_no || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      eway_bill_no: trip.eway_bill_no || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      eway_expiry: trip.eway_expiry || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      destination_gc: trip.destination_gc || trip.destination || '',
      items: trip.items || 'Structural Steel TMT Bars',
      pkgs: trip.pkgs || '12 Bundles',
      articles: trip.articles || 'Steel Articles',
      final_mt: trip.final_mt || so?.mt || 28.5
    });
    setIsOpenDispatchModal(true);
  };

  const handleSaveDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripForDispatch) return;
    store.saveDispatch({
      so_id: activeTripForDispatch.so_id,
      ...dispatchForm
    });
    setIsOpenDispatchModal(false);
  };

  const filteredTrips = trips.filter(t => {
    const matches =
      (t.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.consignor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.gc_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matches;
  });

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Lorry No, SO #, consignor, GC No..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(trips, 'SFMPL_Trips_Dispatch')}
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

      {/* Trips Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                <th className="py-3 px-4 font-semibold">LORRY & SO #</th>
                <th className="py-3 px-4 font-semibold">CONSIGNOR & DESTINATION</th>
                <th className="py-3 px-4 font-semibold">BROKER & BANK DETAILS</th>
                <th className="py-3 px-4 font-semibold">DRIVER CONTACT</th>
                <th className="py-3 px-4 font-semibold">DISPATCH / GC DETAILS</th>
                <th className="py-3 px-4 font-semibold text-center">STATUS</th>
                <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Truck className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-medium">No trips or vehicle allocations found</p>
                    <p className="text-xs text-slate-500 mt-1">Allocate an approved Sales Order to a vehicle</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map(trip => {
                  const broker = brokers.find(b => b.id === trip.broker_id);
                  const isDispatched = trip.dispatch_status === 'DISPATCHED';

                  return (
                    <tr key={trip.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 text-sm">{trip.lorry_no}</div>
                        <div className="font-mono text-blue-400 text-[11px] mt-0.5">{trip.so_number}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{trip.consignor}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">→ {trip.destination || trip.consignee}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{broker?.broker_name || 'Direct Broker'}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          A/C: {trip.broker_acc || broker?.primary_acc_no || '—'} ({trip.broker_ifsc || broker?.ifsc || ''})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200">{trip.driver_contact || '—'}</div>
                        <div className="text-[10px] text-slate-400">Broker: {trip.broker_contact || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isDispatched ? (
                          <div>
                            <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                              <span>{trip.gc_no}</span>
                              <span className="text-[10px] font-normal text-emerald-400">({trip.final_mt} MT)</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              E-Way: {trip.eway_bill_no || '—'} (Exp: {fmtDate(trip.eway_expiry)})
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-400 italic">Documentation Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          trip.trip_status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isDispatched
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {trip.trip_status === 'COMPLETED' ? 'DELIVERED' : trip.dispatch_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isDispatched ? (
                            <button
                              onClick={() => handleOpenDispatch(trip)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <FileCheck className="h-3 w-3" />
                              <span>Dispatch GC</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onCreateMF(trip)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                              title="Generate Money Freight Ledger"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>Create MF</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDispatch(trip)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            title="Edit Dispatch Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Allocate Vehicle */}
      {isOpenAllocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Vehicle & Driver Allocation
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Broker / Transport Partner *</label>
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

              {/* Bank Account Details auto-populated */}
              <div className="p-3 rounded-lg border border-white/5 bg-black/20 space-y-2">
                <div className="text-[11px] font-semibold text-blue-400">Broker Primary Bank Account (for Advances)</div>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Consignor (Pickup)</label>
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

      {/* Modal 2: Dispatch Documentation & GC */}
      {isOpenDispatchModal && activeTripForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Dispatch Documentation: {activeTripForDispatch.lorry_no}
                </h3>
              </div>
              <button
                onClick={() => setIsOpenDispatchModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Date *</label>
                  <input
                    type="date"
                    value={dispatchForm.loading_date}
                    onChange={e => setDispatchForm({ ...dispatchForm, loading_date: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GC / Bilty Number *</label>
                  <input
                    type="text"
                    value={dispatchForm.gc_no}
                    onChange={e => setDispatchForm({ ...dispatchForm, gc_no: e.target.value.toUpperCase() })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={dispatchForm.invoice_no}
                    onChange={e => setDispatchForm({ ...dispatchForm, invoice_no: e.target.value.toUpperCase() })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Actual Loaded MT *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dispatchForm.final_mt}
                    onChange={e => setDispatchForm({ ...dispatchForm, final_mt: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={dispatchForm.eway_bill_no}
                    onChange={e => setDispatchForm({ ...dispatchForm, eway_bill_no: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-Way Expiry Date</label>
                  <input
                    type="date"
                    value={dispatchForm.eway_expiry}
                    onChange={e => setDispatchForm({ ...dispatchForm, eway_expiry: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo / Items</label>
                  <input
                    type="text"
                    value={dispatchForm.items}
                    onChange={e => setDispatchForm({ ...dispatchForm, items: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Packages / Bundles</label>
                  <input
                    type="text"
                    value={dispatchForm.pkgs}
                    onChange={e => setDispatchForm({ ...dispatchForm, pkgs: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpenDispatchModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs"
                >
                  Confirm Dispatch & Generate GC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
