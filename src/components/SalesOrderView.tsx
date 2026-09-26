import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  Calculator,
  Lock
} from 'lucide-react';
import { SalesOrder } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { canEditRecord, canDeleteRecord } from '../utils/permissions';

interface SalesOrderViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onAllocateVehicle: (so: SalesOrder) => void;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
}

export const SalesOrderView: React.FC<SalesOrderViewProps> = ({
  store,
  themeStyles,
  onAllocateVehicle,
  isOpenModal,
  setIsOpenModal
}) => {
  const { salesOrders, parties, places, currentUser } = store.state;
  const canEdit = canEditRecord(currentUser);
  const canDelete = canDeleteRecord(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterConverted, setFilterConverted] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [editingSO, setEditingSO] = useState<Partial<SalesOrder> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form states
  const [formData, setFormData] = useState<{
    id?: number;
    so_number: string;
    party_id: number;
    from_id: number;
    to_id: number;
    mt: number;
    rate_given: number;
    given_labour_type: 'Inclusive' | 'Extra';
    rate_received: number;
    rec_labour_type: 'Inclusive' | 'Extra';
    loading_charge: number;
    converted: 'YES' | 'NO';
    status: 'ACTIVE' | 'CANCELLED';
    remarks: string;
  }>({
    so_number: '',
    party_id: parties[0]?.id || 1,
    from_id: places[0]?.id || 1,
    to_id: places[1]?.id || 2,
    mt: 25,
    rate_given: 3200,
    given_labour_type: 'Inclusive',
    rate_received: 2900,
    rec_labour_type: 'Inclusive',
    loading_charge: 0,
    converted: 'YES',
    status: 'ACTIVE',
    remarks: ''
  });

  // Live Formula Calculations
  const mt = Number(formData.mt) || 0;
  const rateGiven = Number(formData.rate_given) || 0;
  const rateRec = Number(formData.rate_received) || 0;
  const loadingCharge = Number(formData.loading_charge) || 0;

  const effGiven = formData.given_labour_type === 'Inclusive' ? rateGiven : rateGiven + loadingCharge;
  const effRec = formData.rec_labour_type === 'Inclusive' ? rateRec : rateRec + loadingCharge;
  const marginPerMT = effGiven - effRec;
  const totalMargin = marginPerMT * mt;

  const handleOpenCreate = () => {
    setEditingSO(null);
    setFormData({
      so_number: '',
      party_id: parties[0]?.id || 1,
      from_id: places[0]?.id || 1,
      to_id: places[1]?.id || 2,
      mt: 30,
      rate_given: 3500,
      given_labour_type: 'Inclusive',
      rate_received: 3150,
      rec_labour_type: 'Inclusive',
      loading_charge: 0,
      converted: 'YES',
      status: 'ACTIVE',
      remarks: ''
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (so: SalesOrder) => {
    setEditingSO(so);
    setFormData({
      id: so.id,
      so_number: so.so_number,
      party_id: so.party_id,
      from_id: so.from_id,
      to_id: so.to_id,
      mt: so.mt,
      rate_given: so.rate_given,
      given_labour_type: so.given_labour_type,
      rate_received: so.rate_received,
      rec_labour_type: so.rec_labour_type,
      loading_charge: so.loading_charge,
      converted: so.converted,
      status: so.status,
      remarks: so.remarks || ''
    });
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveSalesOrder({
      ...formData,
      id: editingSO?.id
    });
    setIsOpenModal(false);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return salesOrders.filter(so => {
      const party = parties.find(p => p.id === so.party_id);
      const fromPlace = places.find(p => p.id === so.from_id);
      const toPlace = places.find(p => p.id === so.to_id);

      const matchesSearch =
        (so.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party?.party_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fromPlace?.place_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (toPlace?.place_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (so.remarks || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesConverted =
        filterConverted === 'ALL' || so.converted === filterConverted;

      return matchesSearch && matchesConverted;
    });
  }, [salesOrders, parties, places, searchTerm, filterConverted]);

  // Paginated orders for zero-lag indexing
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header controls bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Live Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SO #, party name, route..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
            />
          </div>

          {/* Filter converted */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => { setFilterConverted('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterConverted === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({salesOrders.length})
            </button>
            <button
              onClick={() => { setFilterConverted('YES'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterConverted === 'YES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Converted ({salesOrders.filter(s => s.converted === 'YES').length})
            </button>
            <button
              onClick={() => { setFilterConverted('NO'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterConverted === 'NO' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quotes ({salesOrders.filter(s => s.converted === 'NO').length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(filteredOrders, 'SFMPL_Sales_Orders')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Sales Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                <th className="py-3 px-4 font-semibold">SO NUMBER</th>
                <th className="py-3 px-4 font-semibold">PARTY & ROUTE</th>
                <th className="py-3 px-4 font-semibold text-right">METRIC TON</th>
                <th className="py-3 px-4 font-semibold text-right">RATES (PARTY / LORRY)</th>
                <th className="py-3 px-4 font-semibold text-right">MARGIN / MT</th>
                <th className="py-3 px-4 font-semibold text-right">TOTAL MARGIN</th>
                <th className="py-3 px-4 font-semibold text-center">PIPELINE STAGES</th>
                <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-medium">No sales orders found</p>
                    <p className="text-xs text-slate-500 mt-1">Try changing your filters or create a new order</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((so, idx) => {
                  const party = parties.find(p => p.id === so.party_id);
                  const fromPlace = places.find(p => p.id === so.from_id);
                  const toPlace = places.find(p => p.id === so.to_id);
                  const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={so.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                        {rowIndex}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-100">
                          {so.so_number || <span className="text-slate-400 italic font-sans font-normal">Quotation Only</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {fmtDate(so.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{party?.party_name || '—'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{fromPlace?.place_name}</span>
                          <span>→</span>
                          <span>{toPlace?.place_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                        {so.mt} MT
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="font-mono text-emerald-400 font-medium">{fmtCurrency(so.rate_given)}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{fmtCurrency(so.rate_received)}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          so.margin_per_mt >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                        }`}>
                          {fmtCurrency(so.margin_per_mt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                        {fmtCurrency(so.total_margin)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                          <span
                            title={`Allocation: ${so.allocated ? 'Complete' : 'Pending'}`}
                            className={`px-1.5 py-0.5 rounded ${
                              so.allocated ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            AL
                          </span>
                          <span
                            title={`Dispatch & GC: ${so.documentation_status ? 'Complete' : 'Pending'}`}
                            className={`px-1.5 py-0.5 rounded ${
                              so.documentation_status ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            DC
                          </span>
                          <span
                            title={`Money Freight: ${so.mf_status ? 'Complete' : 'Pending'}`}
                            className={`px-1.5 py-0.5 rounded ${
                              so.mf_status ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            MF
                          </span>
                          <span
                            title={`Unloading: ${so.unloading_status ? 'Complete' : 'Pending'}`}
                            className={`px-1.5 py-0.5 rounded ${
                              so.unloading_status ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            UN
                          </span>
                          <span
                            title={`Profit Audited: ${so.profit_status ? 'Complete' : 'Pending'}`}
                            className={`px-1.5 py-0.5 rounded ${
                              so.profit_status ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            PF
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!so.allocated && (
                            <button
                              onClick={() => onAllocateVehicle(so)}
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
                              title="Assign Vehicle & Driver"
                            >
                              <Truck className="h-3 w-3" />
                              <span>Allocate</span>
                            </button>
                          )}
                          {canEdit ? (
                            <button
                              onClick={() => handleOpenEdit(so)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5"
                              title="Edit Sales Order"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete order ${so.so_number || 'Quotation'}?`)) {
                                  store.deleteSalesOrder(so.id);
                                }
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete Sales Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Indexing Pagination */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          themeStyles={themeStyles}
        />
      </div>

      {/* Modal Dialog: Create / Edit Sales Order with Interactive Math */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  {editingSO ? `Edit Sales Order: ${editingSO.so_number || 'Quotation'}` : 'Create New Sales Order'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Row 1: Party and Route */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Party / Client *</label>
                  <select
                    value={formData.party_id}
                    onChange={e => setFormData({ ...formData, party_id: Number(e.target.value) })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  >
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>{p.party_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">From (Origin) *</label>
                  <select
                    value={formData.from_id}
                    onChange={e => setFormData({ ...formData, from_id: Number(e.target.value) })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  >
                    {places.map(p => (
                      <option key={p.id} value={p.id}>{p.place_name} ({p.state_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">To (Destination) *</label>
                  <select
                    value={formData.to_id}
                    onChange={e => setFormData({ ...formData, to_id: Number(e.target.value) })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  >
                    {places.map(p => (
                      <option key={p.id} value={p.id}>{p.place_name} ({p.state_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Weight and Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weight (MT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mt}
                    onChange={e => setFormData({ ...formData, mt: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Party Rate (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.rate_given}
                    onChange={e => setFormData({ ...formData, rate_given: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Party Labour *</label>
                  <select
                    value={formData.given_labour_type}
                    onChange={e => setFormData({ ...formData, given_labour_type: e.target.value as any })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  >
                    <option value="Inclusive">Inclusive</option>
                    <option value="Extra">Extra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Chrg (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.loading_charge}
                    onChange={e => setFormData({ ...formData, loading_charge: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              {/* Row 3: Lorry rate & labour */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lorry / Broker Rate (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.rate_received}
                    onChange={e => setFormData({ ...formData, rate_received: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lorry Labour *</label>
                  <select
                    value={formData.rec_labour_type}
                    onChange={e => setFormData({ ...formData, rec_labour_type: e.target.value as any })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  >
                    <option value="Inclusive">Inclusive</option>
                    <option value="Extra">Extra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Convert to Confirmed SO?</label>
                  <select
                    value={formData.converted}
                    onChange={e => setFormData({ ...formData, converted: e.target.value as any })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-semibold ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  >
                    <option value="YES">YES — Generate SO Number</option>
                    <option value="NO">NO — Keep as Quotation</option>
                  </select>
                </div>
              </div>

              {/* Real-time calculated summary card */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Real-time Mathematical Calculation
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Effective Party Rate</div>
                    <div className="font-mono font-bold text-slate-100">{fmtCurrency(effGiven)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Effective Lorry Rate</div>
                    <div className="font-mono font-bold text-slate-100">{fmtCurrency(effRec)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Margin Per MT</div>
                    <div className={`font-mono font-bold ${marginPerMT >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtCurrency(marginPerMT)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Total Order Margin</div>
                    <div className={`font-mono font-bold text-sm ${totalMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtCurrency(totalMargin)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks / Cargo Details</label>
                <input
                  type="text"
                  placeholder="e.g. 28 MT TMT Steel bars for JSW site"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                />
              </div>

              {/* Footer actions */}
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-xs"
                >
                  {editingSO ? 'Save Changes' : 'Create Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
