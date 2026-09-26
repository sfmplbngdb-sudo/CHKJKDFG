import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  FileDown,
  Calculator,
  ArrowUpRight,
  Receipt,
  Percent
} from 'lucide-react';
import { Profit, MoneyFreight } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';

interface ProfitReportViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
  selectedMFForProfit?: MoneyFreight | null;
}

export const ProfitReportView: React.FC<ProfitReportViewProps> = ({
  store,
  themeStyles,
  isOpenModal,
  setIsOpenModal,
  selectedMFForProfit
}) => {
  const { profits, moneyFreights, unloadings } = store.state;
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<{
    so_id: number;
    so_number: string;
    mf_no: string;
    bilti_freight: number;
    extra_chrg: number;
    total_cost: number;
    deduction: number;
    ack_date: string;
  }>({
    so_id: moneyFreights[0]?.so_id || 1,
    so_number: moneyFreights[0]?.so_number || '',
    mf_no: moneyFreights[0]?.mf_no || '',
    bilti_freight: moneyFreights[0]?.bilti_freight || 96900,
    extra_chrg: 0,
    total_cost: moneyFreights[0]?.total_cost || 88575,
    deduction: 0,
    ack_date: new Date().toISOString().split('T')[0]
  });

  // Live Formula Calculations
  const bilti = Number(formData.bilti_freight) || 0;
  const extra = Number(formData.extra_chrg) || 0;
  const totalRev = bilti + extra;
  const totalCost = Number(formData.total_cost) || 0;
  const deduction = Number(formData.deduction) || 0;

  const grossProfit = totalRev - totalCost - deduction;
  const gpSale = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;
  const gpPurchase = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

  const handleOpenCreate = (targetMF?: MoneyFreight) => {
    const mf = targetMF || selectedMFForProfit || moneyFreights[0];
    if (!mf) return;
    const unl = unloadings.find(u => u.mf_no === mf.mf_no);

    setFormData({
      so_id: mf.so_id,
      so_number: mf.so_number,
      mf_no: mf.mf_no,
      bilti_freight: mf.bilti_freight || 0,
      extra_chrg: 0,
      total_cost: mf.total_cost || 0,
      deduction: unl?.deduction || 0,
      ack_date: new Date().toISOString().split('T')[0]
    });
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveProfit({
      so_id: formData.so_id,
      so_number: formData.so_number,
      mf_no: formData.mf_no,
      bilti_freight: bilti,
      extra_chrg: extra,
      total_cost: totalCost,
      deduction: deduction,
      ack_date: formData.ack_date
    });
    setIsOpenModal(false);
  };

  const filteredProfits = profits.filter(p => {
    const matches =
      (p.mf_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.so_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matches;
  });

  // Aggregates
  const totalAggRevenue = profits.reduce((s, p) => s + p.total_revenue, 0);
  const totalAggCost = profits.reduce((s, p) => s + p.total_cost, 0);
  const totalAggGP = profits.reduce((s, p) => s + p.gross_profit, 0);
  const avgGPSale = totalAggRevenue > 0 ? (totalAggGP / totalAggRevenue) * 100 : 0;

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Total Bilti Revenue</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
            {fmtCurrency(totalAggRevenue)}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Total Transport Cost</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
            {fmtCurrency(totalAggCost)}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Net Gross Profit</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {fmtCurrency(totalAggGP)}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Avg GP on Sales %</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1 tabular-nums">
            {avgGPSale.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search MF #, SO #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(profits, 'SFMPL_Profit_Report')}
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
            <span>Generate Profit Audit</span>
          </button>
        </div>
      </div>

      {/* Profits Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                <th className="py-3 px-4 font-semibold">MF & SO NUMBER</th>
                <th className="py-3 px-4 font-semibold">ACK DATE</th>
                <th className="py-3 px-4 font-semibold text-right">TOTAL REVENUE</th>
                <th className="py-3 px-4 font-semibold text-right">TOTAL COST</th>
                <th className="py-3 px-4 font-semibold text-right">DEDUCTIONS</th>
                <th className="py-3 px-4 font-semibold text-right">GROSS PROFIT</th>
                <th className="py-3 px-4 font-semibold text-right">GP ON SALES %</th>
                <th className="py-3 px-4 font-semibold text-right">GP ON PURCHASE %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <TrendingUp className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-medium">No audited profit entries found</p>
                    <p className="text-xs text-slate-500 mt-1">Audit Money Freight manifests to generate profit records</p>
                  </td>
                </tr>
              ) : (
                filteredProfits.map(p => (
                  <tr key={p.id} className={themeStyles.tableRowHover}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-100">{p.mf_no}</div>
                      <div className="text-[11px] font-mono text-blue-400 mt-0.5">{p.so_number}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {fmtDate(p.ack_date)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                      {fmtCurrency(p.total_revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {fmtCurrency(p.total_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400 tabular-nums">
                      {p.deduction > 0 ? fmtCurrency(p.deduction) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        p.gross_profit >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                      }`}>
                        {fmtCurrency(p.gross_profit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-400 tabular-nums">
                      {p.gp_on_sale}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {p.gp_on_purchase}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Profit Audit */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Generate Profit Analysis
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
                    const mf = moneyFreights.find(m => m.mf_no === e.target.value);
                    const unl = unloadings.find(u => u.mf_no === e.target.value);
                    if (mf) {
                      setFormData({
                        ...formData,
                        mf_no: mf.mf_no,
                        so_id: mf.so_id,
                        so_number: mf.so_number,
                        bilti_freight: mf.bilti_freight || 0,
                        total_cost: mf.total_cost || 0,
                        deduction: unl?.deduction || 0
                      });
                    }
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                >
                  {moneyFreights.map(m => (
                    <option key={m.id} value={m.mf_no}>
                      {m.mf_no} — {m.lorry_no} (Cost: ₹{m.total_cost})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bilti Freight Revenue (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.bilti_freight}
                    onChange={e => setFormData({ ...formData, bilti_freight: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Extra Charges (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.extra_chrg}
                    onChange={e => setFormData({ ...formData, extra_chrg: parseFloat(e.target.value) || 0 })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Trip Cost (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.total_cost}
                    onChange={e => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Acknowledgment Date</label>
                <input
                  type="date"
                  value={formData.ack_date}
                  onChange={e => setFormData({ ...formData, ack_date: e.target.value })}
                  className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                />
              </div>

              {/* Real-time Profit Formula Card */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Profit Margin Audit
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Gross Profit</div>
                    <div className="font-mono font-bold text-sm text-emerald-400">{fmtCurrency(grossProfit)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">GP on Sale %</div>
                    <div className="font-mono font-bold text-sm text-blue-400">{gpSale.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">GP on Purchase %</div>
                    <div className="font-mono font-bold text-sm text-slate-200">{gpPurchase.toFixed(2)}%</div>
                  </div>
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs"
                >
                  Save Profit Audit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
