import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  FileDown,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Unloading, MoneyFreight } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtDate, exportToExcel } from '../utils/formatters';

interface UnloadingViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onProceedToProfit: (mf: MoneyFreight) => void;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
  selectedMFForUnloading?: MoneyFreight | null;
}

export const UnloadingView: React.FC<UnloadingViewProps> = ({
  store,
  themeStyles,
  onProceedToProfit,
  isOpenModal,
  setIsOpenModal,
  selectedMFForUnloading
}) => {
  const { unloadings, moneyFreights, salesOrders } = store.state;
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<{
    so_id: number;
    so_number: string;
    mf_no: string;
    lorry_no: string;
    unloading_date: string;
    loaded_mt: number;
    unloading_mt: number;
    deduction: number;
  }>({
    so_id: moneyFreights[0]?.so_id || 1,
    so_number: moneyFreights[0]?.so_number || '',
    mf_no: moneyFreights[0]?.mf_no || '',
    lorry_no: moneyFreights[0]?.lorry_no || '',
    unloading_date: new Date().toISOString().split('T')[0],
    loaded_mt: moneyFreights[0]?.final_mt || 28.5,
    unloading_mt: moneyFreights[0]?.final_mt || 28.5,
    deduction: 0
  });

  const shortage = Math.max(0, parseFloat((formData.loaded_mt - formData.unloading_mt).toFixed(3)));

  const handleOpenCreate = (targetMF?: MoneyFreight) => {
    const mf = targetMF || selectedMFForUnloading || moneyFreights[0];
    if (!mf) return;
    setFormData({
      so_id: mf.so_id,
      so_number: mf.so_number,
      mf_no: mf.mf_no,
      lorry_no: mf.lorry_no,
      unloading_date: new Date().toISOString().split('T')[0],
      loaded_mt: mf.final_mt,
      unloading_mt: mf.final_mt,
      deduction: 0
    });
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveUnloading({
      so_id: formData.so_id,
      so_number: formData.so_number,
      mf_no: formData.mf_no,
      lorry_no: formData.lorry_no,
      unloading_date: formData.unloading_date,
      unloading_mt: formData.unloading_mt,
      shortage: shortage,
      deduction: formData.deduction
    });
    setIsOpenModal(false);
  };

  const filtered = unloadings.filter(u => {
    const matches =
      (u.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.mf_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.so_number || '').toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Search Lorry No, MF #, SO #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(unloadings, 'SFMPL_Unloading_Records')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Record Unloading</span>
          </button>
        </div>
      </div>

      {/* Unloading Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                <th className="py-3 px-4 font-semibold">LORRY & MF #</th>
                <th className="py-3 px-4 font-semibold">SO NUMBER</th>
                <th className="py-3 px-4 font-semibold">DELIVERY DATE</th>
                <th className="py-3 px-4 font-semibold text-right">UNLOADED WEIGHT</th>
                <th className="py-3 px-4 font-semibold text-right">SHORTAGE</th>
                <th className="py-3 px-4 font-semibold text-right">SHORTAGE DEDUCTION</th>
                <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ArrowDownToLine className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-medium">No unloading delivery entries recorded yet</p>
                    <p className="text-xs text-slate-500 mt-1">Record weighment receipts from destination warehouses</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const mf = moneyFreights.find(m => m.mf_no === u.mf_no);

                  return (
                    <tr key={u.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 text-sm">{u.lorry_no}</div>
                        <div className="text-[11px] font-mono text-emerald-400 mt-0.5">{u.mf_no}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">
                        {u.so_number}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {fmtDate(u.unloading_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                        {u.unloading_mt} MT
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.shortage > 0 ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {u.shortage > 0 ? `${u.shortage} MT Short` : 'Nil Shortage'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                        {fmtCurrency(u.deduction)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {mf && (
                          <button
                            onClick={() => onProceedToProfit(mf)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <TrendingUp className="h-3 w-3" />
                            <span>Audit Profit</span>
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
      </div>

      {/* Modal Dialog: Record Unloading */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-purple-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Record Unloading & Delivery
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
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Money Freight (MF) *</label>
                <select
                  value={formData.mf_no}
                  onChange={e => {
                    const selected = moneyFreights.find(m => m.mf_no === e.target.value);
                    if (selected) {
                      setFormData({
                        ...formData,
                        mf_no: selected.mf_no,
                        so_id: selected.so_id,
                        so_number: selected.so_number,
                        lorry_no: selected.lorry_no,
                        loaded_mt: selected.final_mt,
                        unloading_mt: selected.final_mt
                      });
                    }
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                >
                  {moneyFreights.map(m => (
                    <option key={m.id} value={m.mf_no}>
                      {m.mf_no} — {m.lorry_no} ({m.final_mt} MT)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Delivery / Unloading Date *</label>
                  <input
                    type="date"
                    value={formData.unloading_date}
                    onChange={e => setFormData({ ...formData, unloading_date: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Original Loaded MT</label>
                  <input
                    type="number"
                    value={formData.loaded_mt}
                    disabled
                    className={`w-full rounded-lg px-3 py-2 text-xs border opacity-70 font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Actual Delivered MT *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.unloading_mt}
                    onChange={e => setFormData({ ...formData, unloading_mt: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shortage Deduction (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.deduction}
                    onChange={e => setFormData({ ...formData, deduction: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              {/* Shortage indicator */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                shortage > 0 ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Calculated Shortage:</span>
                </div>
                <span className="font-mono font-bold text-sm tabular-nums">
                  {shortage.toFixed(3)} MT
                </span>
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
                  Confirm Unloading Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
