import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  FileDown,
  Calculator,
  Trash2,
  Edit2,
  TrendingUp,
  ArrowDownToLine,
  CreditCard,
  Fuel,
  Percent,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { MoneyFreight, TripDispatch } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { SkeletonTable } from './common/SkeletonLoader';
import { canEditRecord, canDeleteRecord } from '../utils/permissions';

interface MoneyFreightViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onProceedToUnloading: (mf: MoneyFreight) => void;
  onProceedToProfit: (mf: MoneyFreight) => void;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
  selectedTripForMF?: TripDispatch | null;
}

export const MoneyFreightView: React.FC<MoneyFreightViewProps> = ({
  store,
  themeStyles,
  onProceedToUnloading,
  onProceedToProfit,
  isOpenModal,
  setIsOpenModal,
  selectedTripForMF
}) => {
  const { moneyFreights, trips, salesOrders, cards, currentUser } = store.state;
  const canEdit = canEditRecord(currentUser);
  const canDelete = canDeleteRecord(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingMF, setEditingMF] = useState<Partial<MoneyFreight> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Form State including LM, PM, LM D, PM D
  const [formData, setFormData] = useState<{
    id?: number;
    mf_no: string;
    so_id: number;
    so_number: string;
    lorry_no: string;
    loading_point: string;
    loading_clerk: string;
    pmt_rate: number;
    final_mt: number;
    other_expense: number;
    l_m: number;
    p_m: number;
    lm_d: number;
    pm_d: number;
    advance: number;
    diesel: number;
    diesel_paid: number;
    diesel_payment_type: string;
    diesel_ref: string;
    diesel_card: string;
    other: number;
    loading_labour: number;
    fooding: number;
    con: number;
    unloading: number;
    xerox: number;
    detention: number;
    extra_point: number;
    other_chrg: number;
    extra_labour: number;
    bill_pmt: number;
  }>({
    mf_no: '',
    so_id: trips[0]?.so_id || 1,
    so_number: trips[0]?.so_number || '',
    lorry_no: trips[0]?.lorry_no || '',
    loading_point: 'Yard 1 Point A',
    loading_clerk: 'Admin Clerk',
    pmt_rate: 3000,
    final_mt: 28.5,
    other_expense: 0,
    l_m: 0,
    p_m: 0,
    lm_d: 0,
    pm_d: 0,
    advance: 35000,
    diesel: 20000,
    diesel_paid: 20000,
    diesel_payment_type: 'Card',
    diesel_ref: 'BPCL-DT-991',
    diesel_card: cards[0]?.card_display || '',
    other: 0,
    loading_labour: 600,
    fooding: 300,
    con: 150,
    unloading: 0,
    xerox: 50,
    detention: 0,
    extra_point: 0,
    other_chrg: 0,
    extra_labour: 0,
    bill_pmt: 3350
  });

  // Calculations
  const finalMT = Number(formData.final_mt) || 0;
  const pmtRate = Number(formData.pmt_rate) || 0;
  const totalFreight = finalMT * pmtRate;

  const lm = Number(formData.l_m) || 0;
  const pm = Number(formData.p_m) || 0;
  const lmD = Number(formData.lm_d) || 0;
  const pmD = Number(formData.pm_d) || 0;
  // LM_D and PM_D are purely for display/record purpose and not calculated with freight
  const totalDeductions = lm + pm;
  const otherExp = Number(formData.other_expense) || 0;
  const freightMF = totalFreight - lm - pm + otherExp;

  const adv = Number(formData.advance) || 0;
  const diesel = Number(formData.diesel) || 0;
  const other = Number(formData.other) || 0;
  const balance = freightMF - adv - diesel + other;

  const ll = Number(formData.loading_labour) || 0;
  const food = Number(formData.fooding) || 0;
  const con = Number(formData.con) || 0;
  const unl = Number(formData.unloading) || 0;
  const xerox = Number(formData.xerox) || 0;
  const det = Number(formData.detention) || 0;
  const ep = Number(formData.extra_point) || 0;
  const oc = Number(formData.other_chrg) || 0;
  const totalExp = ll + food + con + unl + xerox + det + ep + oc;

  const extraLabour = Number(formData.extra_labour) || 0;
  const totalCost = freightMF + totalExp + extraLabour;

  const billPmt = Number(formData.bill_pmt) || 0;
  const biltiFreight = billPmt * finalMT;

  const handleOpenCreate = (targetTrip?: TripDispatch) => {
    const t = targetTrip || selectedTripForMF || trips.find(trip => trip.dispatch_status === 'DISPATCHED') || trips[0];
    const so = salesOrders.find(s => s.id === t?.so_id);

    setEditingMF(null);
    setFormData({
      mf_no: '',
      so_id: t ? t.so_id : 1,
      so_number: t ? t.so_number : '',
      lorry_no: t ? t.lorry_no : '',
      loading_point: 'Main Terminal',
      loading_clerk: 'Station Officer',
      pmt_rate: so ? so.rate_received : 3000,
      final_mt: t?.final_mt || so?.mt || 28.5,
      other_expense: 0,
      l_m: 0,
      p_m: 0,
      lm_d: 0,
      pm_d: 0,
      advance: 35000,
      diesel: 20000,
      diesel_paid: 20000,
      diesel_payment_type: 'Card',
      diesel_ref: 'BPCL-DT-991',
      diesel_card: cards[0]?.card_display || '',
      other: 0,
      loading_labour: 600,
      fooding: 350,
      con: 150,
      unloading: 0,
      xerox: 50,
      detention: 0,
      extra_point: 0,
      other_chrg: 0,
      extra_labour: 0,
      bill_pmt: so ? so.rate_given : 3350
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (mf: MoneyFreight) => {
    setEditingMF(mf);
    setFormData({
      id: mf.id,
      mf_no: mf.mf_no,
      so_id: mf.so_id,
      so_number: mf.so_number,
      lorry_no: mf.lorry_no,
      loading_point: mf.loading_point,
      loading_clerk: mf.loading_clerk,
      pmt_rate: mf.pmt_rate,
      final_mt: mf.final_mt,
      other_expense: mf.other_expense,
      l_m: mf.l_m || 0,
      p_m: mf.p_m || 0,
      lm_d: mf.lm_d || 0,
      pm_d: mf.pm_d || 0,
      advance: mf.advance,
      diesel: mf.diesel,
      diesel_paid: mf.diesel_paid,
      diesel_payment_type: mf.diesel_payment_type,
      diesel_ref: mf.diesel_ref,
      diesel_card: mf.diesel_card,
      other: mf.other,
      loading_labour: mf.loading_labour,
      fooding: mf.fooding,
      con: mf.con,
      unloading: mf.unloading,
      xerox: mf.xerox,
      detention: mf.detention,
      extra_point: mf.extra_point,
      other_chrg: mf.other_chrg,
      extra_labour: mf.extra_labour,
      bill_pmt: mf.bill_pmt
    });
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveMoneyFreight({
      ...formData,
      id: editingMF?.id
    });
    setIsOpenModal(false);
  };

  // Filter & Search
  const filteredMFs = useMemo(() => {
    return moneyFreights.filter(m => {
      const matches =
        (m.mf_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.so_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.loading_point || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.loading_clerk || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matches;
    });
  }, [moneyFreights, searchTerm]);

  // Paginated dataset (Indexing without load)
  const paginatedMFs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMFs.slice(start, start + pageSize);
  }, [filteredMFs, currentPage, pageSize]);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner with Formulas Overview */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Money Freight (MF) Manifest & Freight Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time freight math with <strong>LM</strong> (Loading Munshiana), <strong>PM</strong> (Passing Munshiana), <strong>LM D</strong>, <strong>PM D</strong> deductions, and trip balance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(moneyFreights, 'SFMPL_Money_Freight')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Money Freight</span>
          </button>
        </div>
      </div>

      {/* Operational & Financial Summary KPI Ribbon (Clean metrics, no internal formulas exposed) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL GROSS FREIGHT</span>
          <span className="font-mono text-slate-100 font-bold text-sm">
            {fmtCurrency(moneyFreights.reduce((s, m) => s + (m.total_freight || 0), 0))}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">NET FREIGHT (MF)</span>
          <span className="font-mono text-emerald-400 font-bold text-sm">
            {fmtCurrency(moneyFreights.reduce((s, m) => s + (m.freight_mf || 0), 0))}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">ADVANCES & FUEL PAID</span>
          <span className="font-mono text-blue-400 font-bold text-sm">
            {fmtCurrency(moneyFreights.reduce((s, m) => s + (m.advance || 0) + (m.diesel || 0), 0))}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">PENDING LORRY BALANCE</span>
          <span className="font-mono text-amber-400 font-bold text-sm">
            {fmtCurrency(moneyFreights.reduce((s, m) => s + (m.balance || 0), 0))}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search MF #, Lorry No, SO #, clerk, terminal..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>
      </div>

      {/* MF Records Table */}
      {isLoading ? (
        <SkeletonTable rows={pageSize} cols={9} themeStyles={themeStyles} />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">MF # & LORRY</th>
                  <th className="py-3 px-4 font-semibold text-right">WEIGHT & RATE</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL FREIGHT</th>
                  <th className="py-3 px-4 font-semibold text-center">LM / PM / DEDUCTIONS</th>
                  <th className="py-3 px-4 font-semibold text-right">FREIGHT MF</th>
                  <th className="py-3 px-4 font-semibold text-right">ADV & DIESEL</th>
                  <th className="py-3 px-4 font-semibold text-right">BALANCE DUE</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedMFs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Receipt className="h-8 w-8 mx-auto opacity-40 mb-2" />
                      <p className="text-sm font-medium">No Money Freight records found</p>
                      <p className="text-xs text-slate-500 mt-1">Generate MF from a dispatched vehicle to record freight settlement</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMFs.map((mf, idx) => {
                    const rowLM = mf.l_m || 0;
                    const rowPM = mf.p_m || 0;
                    const rowLMD = mf.lm_d || 0;
                    const rowPMD = mf.pm_d || 0;
                    // LM_D and PM_D are record/display only, not deducted
                    const totalDeds = rowLM + rowPM;
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={mf.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                          {rowIndex}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono text-sm">{mf.mf_no}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {mf.lorry_no} • <span className="text-blue-400">{mf.so_number}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono text-slate-200 font-bold">{fmtNum(mf.final_mt)} MT</div>
                          <div className="font-mono text-slate-400 text-[11px]">@ {fmtCurrency(mf.pmt_rate)}/MT</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-200">
                          {fmtCurrency(mf.total_freight)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {totalDeds > 0 || rowLMD > 0 || rowPMD > 0 ? (
                            <div className="inline-block p-1 rounded bg-black/30 border border-white/5 text-[10px] font-mono">
                              <span className="text-rose-400 font-bold">-₹{totalDeds}</span>
                              <div className="text-slate-400 text-[9px] mt-0.5">
                                LM: {rowLM} | PM: {rowPM}
                                {(rowLMD > 0 || rowPMD > 0) && (
                                  <span className="text-slate-500 block">Rec: LMD {rowLMD} • PMD {rowPMD}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {fmtCurrency(mf.freight_mf)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono text-slate-200 text-[11px]">Adv: {fmtCurrency(mf.advance)}</div>
                          <div className="font-mono text-slate-400 text-[10px] mt-0.5">Dsl: {fmtCurrency(mf.diesel)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          {fmtCurrency(mf.balance)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => onProceedToUnloading(mf)}
                            className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-medium text-[10px] transition-colors"
                            title="Record Delivery & Unloading"
                          >
                            Unload
                          </button>
                          <button
                            onClick={() => onProceedToProfit(mf)}
                            className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-medium text-[10px] transition-colors"
                            title="Audit Profit"
                          >
                            Profit
                          </button>
                          {canEdit ? (
                            <button
                              onClick={() => handleOpenEdit(mf)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
                              title="Edit MF"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete Money Freight #${mf.mf_no}?`)) {
                                  store.deleteMoneyFreight(mf.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-white/10 text-rose-400 hover:text-rose-300"
                              title="Delete MF"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            totalItems={filteredMFs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            themeStyles={themeStyles}
          />
        </div>
      )}

      {/* Money Freight Modal with Full LM, PM, LM D, PM D & Formulas */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  {editingMF ? `Edit Money Freight: ${editingMF.mf_no}` : 'Generate Money Freight (MF)'}
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
              {/* Trip selector and Clerk */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Dispatched Vehicle *</label>
                  <select
                    value={formData.so_id}
                    onChange={e => {
                      const soId = Number(e.target.value);
                      const t = trips.find(tr => tr.so_id === soId);
                      const s = salesOrders.find(so => so.id === soId);
                      setFormData({
                        ...formData,
                        so_id: soId,
                        so_number: t?.so_number || s?.so_number || '',
                        lorry_no: t?.lorry_no || '',
                        final_mt: t?.final_mt || s?.mt || 28.5,
                        pmt_rate: s?.rate_received || 3000,
                        bill_pmt: s?.rate_given || 3350
                      });
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.so_id}>
                        {t.lorry_no} ({t.so_number}) — {t.consignor}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Point</label>
                  <input
                    type="text"
                    value={formData.loading_point}
                    onChange={e => setFormData({ ...formData, loading_point: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Clerk / Supervisor</label>
                  <input
                    type="text"
                    value={formData.loading_clerk}
                    onChange={e => setFormData({ ...formData, loading_clerk: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              {/* Weight, PMT Rate, Billing Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Final Loaded MT *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.final_mt}
                    onChange={e => setFormData({ ...formData, final_mt: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PMT Rate / MT (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.pmt_rate}
                    onChange={e => setFormData({ ...formData, pmt_rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bill PMT / MT (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.bill_pmt}
                    onChange={e => setFormData({ ...formData, bill_pmt: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Other Loading Exp (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.other_expense}
                    onChange={e => setFormData({ ...formData, other_expense: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              {/* LM, PM, LM D, PM D Mamul Deductions */}
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    Loading & Passing Mamul (LM, PM) & Record Keeping (LM D, PM D)
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-300">
                    Applied Deductions (LM + PM): -₹{totalDeductions}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  LM and PM are deducted from total freight. <strong>LM D and PM D are for display / record purpose only</strong> and do not affect freight calculations.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">LM (Loading Mamul ₹)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={formData.l_m}
                      onChange={e => setFormData({ ...formData, l_m: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono text-rose-300 ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">PM (Passing Mamul ₹)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={formData.p_m}
                      onChange={e => setFormData({ ...formData, p_m: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono text-rose-300 ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      LM D <span className="text-[10px] text-slate-400 font-normal">(Record Only ₹)</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={formData.lm_d}
                      onChange={e => setFormData({ ...formData, lm_d: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono text-slate-300 ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      PM D <span className="text-[10px] text-slate-400 font-normal">(Record Only ₹)</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={formData.pm_d}
                      onChange={e => setFormData({ ...formData, pm_d: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono text-slate-300 ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                </div>
              </div>

              {/* Advance & Diesel Details */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/20 space-y-3">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel className="h-3.5 w-3.5" />
                  <span>Advances & Diesel Distribution</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cash/Bank Advance (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.advance}
                      onChange={e => setFormData({ ...formData, advance: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Diesel Value (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.diesel}
                      onChange={e => setFormData({ ...formData, diesel: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Diesel Mode</label>
                    <select
                      value={formData.diesel_payment_type}
                      onChange={e => setFormData({ ...formData, diesel_payment_type: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    >
                      <option value="Card">Fleet Card</option>
                      <option value="Cash">Cash At Pump</option>
                      <option value="Slip">Pump Slip</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Other Adjustments (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.other}
                      onChange={e => setFormData({ ...formData, other: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                </div>

                {formData.diesel_payment_type === 'Card' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Select Diesel Card</label>
                      <select
                        value={formData.diesel_card}
                        onChange={e => setFormData({ ...formData, diesel_card: e.target.value })}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      >
                        {cards.map(c => (
                          <option key={c.id} value={c.card_display}>{c.card_display}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Diesel Ref / Slip #</label>
                      <input
                        type="text"
                        value={formData.diesel_ref}
                        onChange={e => setFormData({ ...formData, diesel_ref: e.target.value })}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Trip Expenses */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Trip Expenses Breakdown
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-300">
                    Total Exp: ₹{totalExp}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">Loading Labour</label>
                    <input
                      type="number"
                      value={formData.loading_labour}
                      onChange={e => setFormData({ ...formData, loading_labour: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Fooding</label>
                    <input
                      type="number"
                      value={formData.fooding}
                      onChange={e => setFormData({ ...formData, fooding: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Convenience (Con)</label>
                    <input
                      type="number"
                      value={formData.con}
                      onChange={e => setFormData({ ...formData, con: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Unloading Labour</label>
                    <input
                      type="number"
                      value={formData.unloading}
                      onChange={e => setFormData({ ...formData, unloading: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Xerox / Toll</label>
                    <input
                      type="number"
                      value={formData.xerox}
                      onChange={e => setFormData({ ...formData, xerox: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Detention</label>
                    <input
                      type="number"
                      value={formData.detention}
                      onChange={e => setFormData({ ...formData, detention: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Extra Point</label>
                    <input
                      type="number"
                      value={formData.extra_point}
                      onChange={e => setFormData({ ...formData, extra_point: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Extra Labour (Cost)</label>
                    <input
                      type="number"
                      value={formData.extra_labour}
                      onChange={e => setFormData({ ...formData, extra_labour: parseFloat(e.target.value) || 0 })}
                      className={`w-full rounded px-2 py-1 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                </div>
              </div>

              {/* Live Mathematical Audit Box */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="h-4 w-4" />
                  <span>Real-Time Audit Ledger</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Freight:</span>
                    <span className="font-mono font-bold text-slate-200">₹{totalFreight.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Net Freight MF:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">₹{freightMF.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance Payable:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">₹{balance.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Trip Cost:</span>
                    <span className="font-mono font-bold text-purple-300">₹{totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs"
                >
                  Save & Reconcile MF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
