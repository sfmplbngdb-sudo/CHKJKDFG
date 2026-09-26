import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileDown,
  Search,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  TableProperties
} from 'lucide-react';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { MasterReportView } from './MasterReportView';

interface ReportsHubViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
}

type ReportType =
  | 'master-all'
  | 'so-margins'
  | 'allocations'
  | 'dispatch-eway'
  | 'mf-audit'
  | 'shortage'
  | 'pnl'
  | 'settlement';

export const ReportsHubView: React.FC<ReportsHubViewProps> = ({ store, themeStyles }) => {
  const { salesOrders, trips, moneyFreights, unloadings, profits, accounts, parties, places, brokers } = store.state;

  const [activeReport, setActiveReport] = useState<ReportType>('mf-audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Helper maps
  const partyMap = useMemo(() => new Map(parties.map(p => [p.id, p.party_name])), [parties]);
  const placeMap = useMemo(() => new Map(places.map(p => [p.id, p.place_name])), [places]);
  const brokerMap = useMemo(() => new Map(brokers.map(b => [b.id, b.broker_name])), [brokers]);

  // Handle export for active report
  const handleExportActive = () => {
    if (activeReport === 'so-margins') {
      const data = salesOrders.map(s => ({
        SO_Number: s.so_number,
        Party: partyMap.get(s.party_id) || 'Unknown',
        From: placeMap.get(s.from_id) || '',
        To: placeMap.get(s.to_id) || '',
        MT: s.mt,
        Party_Rate: s.rate_given,
        Lorry_Rate: s.rate_received,
        Margin_Per_MT: s.margin_per_mt,
        Total_Margin: s.total_margin,
        Converted: s.converted,
        Allocated: s.allocated ? 'YES' : 'NO'
      }));
      exportToExcel(data, 'SFMPL_Sales_Order_Margins_Report');
    } else if (activeReport === 'allocations') {
      const data = trips.map(t => ({
        Lorry_No: t.lorry_no,
        SO_Number: t.so_number,
        Allocation_Date: t.allocation_date || t.created_at,
        Consignor: t.consignor,
        Destination: t.destination,
        Broker: brokerMap.get(t.broker_id || 0) || 'Direct',
        Driver_Contact: t.driver_contact,
        Status: t.dispatch_status
      }));
      exportToExcel(data, 'SFMPL_Vehicle_Allocation_Report');
    } else if (activeReport === 'dispatch-eway') {
      const data = trips.map(t => ({
        GC_Number: t.gc_no || 'Pending',
        Lorry_No: t.lorry_no,
        SO_Number: t.so_number,
        Loading_Date: t.loading_date || '',
        Invoice_Number: t.invoice_no || '',
        EWay_Bill_No: t.eway_bill_no || '',
        EWay_Expiry: t.eway_expiry || '',
        Final_Loaded_MT: t.final_mt || 0,
        Items: t.items || '',
        Status: t.dispatch_status
      }));
      exportToExcel(data, 'SFMPL_Dispatch_EWay_Compliance_Report');
    } else if (activeReport === 'mf-audit') {
      const data = moneyFreights.map(m => ({
        MF_Number: m.mf_no,
        Lorry_No: m.lorry_no,
        SO_Number: m.so_number,
        Final_MT: m.final_mt,
        PMT_Rate: m.pmt_rate,
        Total_Freight: m.total_freight,
        LM: m.l_m || 0,
        PM: m.p_m || 0,
        LM_D: m.lm_d || 0,
        PM_D: m.pm_d || 0,
        Total_Mamul_Deductions: (m.l_m || 0) + (m.p_m || 0),
        Freight_MF: m.freight_mf,
        Advance: m.advance,
        Diesel: m.diesel,
        Balance_Payable: m.balance,
        Trip_Expenses: m.total_exp,
        Total_Cost: m.total_cost,
        Bill_PMT: m.bill_pmt,
        Bilti_Freight: m.bilti_freight
      }));
      exportToExcel(data, 'SFMPL_Money_Freight_Audit_Report');
    } else if (activeReport === 'shortage') {
      const data = unloadings.map(u => ({
        SO_Number: u.so_number,
        MF_Number: u.mf_no,
        Lorry_No: u.lorry_no,
        Unloading_Date: u.unloading_date,
        Unloaded_MT: u.unloading_mt,
        Shortage_MT: u.shortage,
        Deduction_Amount: u.deduction
      }));
      exportToExcel(data, 'SFMPL_Shortage_Deductions_Report');
    } else if (activeReport === 'pnl') {
      const data = profits.map(p => ({
        SO_Number: p.so_number,
        MF_Number: p.mf_no,
        Bilti_Freight: p.bilti_freight,
        Extra_Charges: p.extra_chrg,
        Total_Revenue: p.total_revenue,
        Total_Cost: p.total_cost,
        Deductions: p.deduction,
        Gross_Profit: p.gross_profit,
        GP_On_Sale_Pct: p.gp_on_sale,
        GP_On_Purchase_Pct: p.gp_on_purchase
      }));
      exportToExcel(data, 'SFMPL_PnL_Executive_Report');
    } else if (activeReport === 'settlement') {
      const data = accounts.map(a => ({
        MF_Number: a.mf_no,
        Lorry_No: a.lorry_no,
        Broker: a.broker_name || '',
        Advance_Amount: a.advance_amount,
        Adv_Paid: a.adv_paid_amount,
        Adv_Txn: a.adv_txn_id,
        Adv_Status: a.adv_status,
        Balance_Amount: a.balance_amount,
        Bal_Paid: a.bal_paid_amount,
        Bal_Txn: a.bal_txn_id,
        Bal_Status: a.bal_status,
        Overall_Status: a.overall_status
      }));
      exportToExcel(data, 'SFMPL_Transporter_Settlement_Report');
    }
  };

  // KPIs
  const totalRev = profits.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
  const totalCost = profits.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalProfit = profits.reduce((sum, p) => sum + (p.gross_profit || 0), 0);
  const totalFreightPaid = moneyFreights.reduce((sum, m) => sum + (m.freight_mf || 0), 0);
  const totalDeductionsRecorded = moneyFreights.reduce(
    (sum, m) => sum + (m.l_m || 0) + (m.p_m || 0),
    0
  );

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Enterprise TMS Reports & Compliance Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete operational manifests, LM/PM deduction audit, E-Way Bill tracking, and gross margin balance sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportActive}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Active Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL REVENUE</span>
          <span className="font-mono text-emerald-400 font-bold text-sm">{fmtCurrency(totalRev)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL FLEET COST</span>
          <span className="font-mono text-purple-300 font-bold text-sm">{fmtCurrency(totalCost)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">GROSS MARGIN (P&L)</span>
          <span className="font-mono text-blue-400 font-bold text-sm">{fmtCurrency(totalProfit)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">NET FREIGHT MF PAID</span>
          <span className="font-mono text-slate-200 font-bold text-sm">{fmtCurrency(totalFreightPaid)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL MAMUL / DEDUCTIONS</span>
          <span className="font-mono text-rose-400 font-bold text-sm">-₹{totalDeductionsRecorded.toLocaleString()}</span>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 text-xs">
        {[
          { id: 'master-all', label: 'Master Report (All-in-One)', icon: TableProperties },
          { id: 'mf-audit', label: 'Money Freight (MF) Audit', icon: Receipt },
          { id: 'dispatch-eway', label: 'Dispatch & E-Way Bill Compliance', icon: FileText },
          { id: 'allocations', label: 'Vehicle Allocation Ledger', icon: Truck },
          { id: 'so-margins', label: 'Sales Order Margins', icon: TrendingUp },
          { id: 'pnl', label: 'Profit & Loss (P&L) Audit', icon: BarChart3 },
          { id: 'shortage', label: 'Delivery Shortage Register', icon: Layers },
          { id: 'settlement', label: 'Bank Disbursement Ledger', icon: CheckCircle2 }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeReport === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveReport(item.id as any);
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {activeReport === 'master-all' ? (
        <MasterReportView store={store} themeStyles={themeStyles} />
      ) : (
        <>
          {/* Search Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search report records..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>
      </div>

      {/* Dynamic Report Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          {/* 1. Money Freight Audit Report */}
          {activeReport === 'mf-audit' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">MF # & LORRY</th>
                  <th className="py-3 px-4 font-semibold text-right">WEIGHT</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL FREIGHT</th>
                  <th className="py-3 px-4 font-semibold text-center">LM / PM / LM_D / PM_D</th>
                  <th className="py-3 px-4 font-semibold text-right">FREIGHT MF</th>
                  <th className="py-3 px-4 font-semibold text-right">ADV & DIESEL</th>
                  <th className="py-3 px-4 font-semibold text-right">BALANCE PAYABLE</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL COST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moneyFreights
                  .filter(m => (m.mf_no + m.lorry_no + m.so_number).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((m, idx) => {
                    const rowLM = m.l_m || 0;
                    const rowPM = m.p_m || 0;
                    const rowLMD = m.lm_d || 0;
                    const rowPMD = m.pm_d || 0;
                    const totDeds = rowLM + rowPM;
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={m.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono">{m.mf_no}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.lorry_no} • {m.so_number}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-200">{m.final_mt} MT</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{fmtCurrency(m.total_freight)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono text-rose-400 font-semibold text-[11px]">-₹{totDeds}</div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            LM:{rowLM} PM:{rowPM}
                            {(rowLMD > 0 || rowPMD > 0) && (
                              <span className="text-slate-500 block">Rec: LMD:{rowLMD} PMD:{rowPMD}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{fmtCurrency(m.freight_mf)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300 text-[11px]">
                          <div>Adv: {fmtCurrency(m.advance)}</div>
                          <div className="text-[10px] text-slate-400">Dsl: {fmtCurrency(m.diesel)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">{fmtCurrency(m.balance)}</td>
                        <td className="py-3 px-4 text-right font-mono text-purple-300">{fmtCurrency(m.total_cost)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 2. Dispatch & E-Way Bill Compliance */}
          {activeReport === 'dispatch-eway' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">GC / BILTY & LORRY</th>
                  <th className="py-3 px-4 font-semibold">LOADING DATE</th>
                  <th className="py-3 px-4 font-semibold">INVOICE NUMBER</th>
                  <th className="py-3 px-4 font-semibold">E-WAY BILL #</th>
                  <th className="py-3 px-4 font-semibold">E-WAY EXPIRY</th>
                  <th className="py-3 px-4 font-semibold text-right">FINAL MT</th>
                  <th className="py-3 px-4 font-semibold">CARGO PARTICULARS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips
                  .filter(t => (t.gc_no || '' + t.lorry_no + t.eway_bill_no).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={t.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono">{t.gc_no || 'Pending GC'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{t.lorry_no} • {t.so_number}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{fmtDate(t.loading_date || t.created_at)}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{t.invoice_no || '—'}</td>
                        <td className="py-3 px-4 font-mono text-slate-200">{t.eway_bill_no || '—'}</td>
                        <td className="py-3 px-4 font-mono text-amber-300">{t.eway_expiry || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">{t.final_mt || '—'} MT</td>
                        <td className="py-3 px-4 text-slate-300">{t.items || 'General Steel'} ({t.pkgs || '—'})</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 3. Vehicle Allocation Ledger */}
          {activeReport === 'allocations' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">LORRY & SO #</th>
                  <th className="py-3 px-4 font-semibold">ALLOCATION DATE</th>
                  <th className="py-3 px-4 font-semibold">CONSIGNOR & ROUTE</th>
                  <th className="py-3 px-4 font-semibold">TRANSPORTER / BROKER</th>
                  <th className="py-3 px-4 font-semibold">ADVANCE BANK A/C</th>
                  <th className="py-3 px-4 font-semibold">DRIVER PHONE</th>
                  <th className="py-3 px-4 font-semibold text-center">STAGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips
                  .filter(t => (t.lorry_no + t.so_number + t.consignor).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={t.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono">{t.lorry_no}</div>
                          <div className="text-[11px] text-blue-400 font-mono">{t.so_number}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{fmtDate(t.allocation_date || t.created_at)}</td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200">{t.consignor}</div>
                          <div className="text-[11px] text-slate-400">→ {t.destination}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-200">{brokerMap.get(t.broker_id || 0) || 'Direct'}</td>
                        <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                          {t.broker_acc ? `${t.broker_acc} (${t.broker_ifsc})` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">{t.driver_contact || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                            {t.dispatch_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 4. Sales Order Margins */}
          {activeReport === 'so-margins' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">SO NUMBER</th>
                  <th className="py-3 px-4 font-semibold">PARTY / CLIENT</th>
                  <th className="py-3 px-4 font-semibold">ROUTE</th>
                  <th className="py-3 px-4 font-semibold text-right">ORDER MT</th>
                  <th className="py-3 px-4 font-semibold text-right">PARTY RATE</th>
                  <th className="py-3 px-4 font-semibold text-right">LORRY RATE</th>
                  <th className="py-3 px-4 font-semibold text-right">MARGIN/MT</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL MARGIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {salesOrders
                  .filter(s => (s.so_number + (partyMap.get(s.party_id) || '')).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((s, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={s.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4 font-bold font-mono text-blue-400">{s.so_number || `SO-${s.id}`}</td>
                        <td className="py-3 px-4 text-slate-200">{partyMap.get(s.party_id) || 'Unknown'}</td>
                        <td className="py-3 px-4 text-slate-300 text-[11px]">
                          {placeMap.get(s.from_id)} → {placeMap.get(s.to_id)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">{s.mt} MT</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-300">₹{s.rate_given}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-300">₹{s.rate_received}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">₹{s.margin_per_mt}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {fmtCurrency(s.total_margin)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 5. Profit & Loss Report */}
          {activeReport === 'pnl' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">SO & MF #</th>
                  <th className="py-3 px-4 font-semibold text-right">BILTI FREIGHT</th>
                  <th className="py-3 px-4 font-semibold text-right">EXTRA REVENUE</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL REVENUE</th>
                  <th className="py-3 px-4 font-semibold text-right">TOTAL COST</th>
                  <th className="py-3 px-4 font-semibold text-right">GROSS PROFIT</th>
                  <th className="py-3 px-4 font-semibold text-right">GP SALE %</th>
                  <th className="py-3 px-4 font-semibold text-right">GP PURCHASE %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profits
                  .filter(p => (p.so_number + p.mf_no).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((p, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={p.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono">{p.so_number}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.mf_no}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{fmtCurrency(p.bilti_freight)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{fmtCurrency(p.extra_chrg)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{fmtCurrency(p.total_revenue)}</td>
                        <td className="py-3 px-4 text-right font-mono text-purple-300">{fmtCurrency(p.total_cost)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">{fmtCurrency(p.gross_profit)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-300">{p.gp_on_sale}%</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-300">{p.gp_on_purchase}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 6. Shortage Register */}
          {activeReport === 'shortage' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">SO # & MF #</th>
                  <th className="py-3 px-4 font-semibold">LORRY NO</th>
                  <th className="py-3 px-4 font-semibold">UNLOADING DATE</th>
                  <th className="py-3 px-4 font-semibold text-right">UNLOADED MT</th>
                  <th className="py-3 px-4 font-semibold text-right">SHORTAGE MT</th>
                  <th className="py-3 px-4 font-semibold text-right">DEDUCTION AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unloadings
                  .filter(u => (u.so_number + u.mf_no + u.lorry_no).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((u, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={u.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{u.so_number} ({u.mf_no})</td>
                        <td className="py-3 px-4 font-mono text-slate-200">{u.lorry_no}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{fmtDate(u.unloading_date)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-200">{u.unloading_mt} MT</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">{u.shortage} MT</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">{fmtCurrency(u.deduction)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* 7. Transporter Settlement */}
          {activeReport === 'settlement' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-3 px-4 font-semibold">MF # & LORRY</th>
                  <th className="py-3 px-4 font-semibold">BROKER / TRANSPORTER</th>
                  <th className="py-3 px-4 font-semibold text-right">ADVANCE DUE</th>
                  <th className="py-3 px-4 font-semibold text-right">ADV PAID & UTR</th>
                  <th className="py-3 px-4 font-semibold text-right">BALANCE DUE</th>
                  <th className="py-3 px-4 font-semibold text-right">BAL PAID & UTR</th>
                  <th className="py-3 px-4 font-semibold text-center">OVERALL STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts
                  .filter(a => (a.mf_no + a.lorry_no + (a.broker_name || '')).toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((a, idx) => {
                    const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={a.id} className={themeStyles.tableRowHover}>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{rowIndex}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 font-mono">{a.mf_no}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{a.lorry_no}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-200">{a.broker_name || 'Direct'}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{fmtCurrency(a.advance_amount)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 text-[11px]">
                          <div>{fmtCurrency(a.adv_paid_amount)}</div>
                          <div className="text-[10px] text-slate-400">UTR: {a.adv_txn_id || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{fmtCurrency(a.balance_amount)}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-400 text-[11px]">
                          <div>{fmtCurrency(a.bal_paid_amount)}</div>
                          <div className="text-[10px] text-slate-400">UTR: {a.bal_txn_id || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            a.overall_status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {a.overall_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

          {/* Universal Pagination */}
          <PaginationControl
            currentPage={currentPage}
            totalItems={
              activeReport === 'mf-audit'
                ? moneyFreights.length
                : activeReport === 'dispatch-eway' || activeReport === 'allocations'
                ? trips.length
                : activeReport === 'so-margins'
                ? salesOrders.length
                : activeReport === 'pnl'
                ? profits.length
                : activeReport === 'shortage'
                ? unloadings.length
                : accounts.length
            }
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            themeStyles={themeStyles}
          />
        </div>
      </>
      )}
    </div>
  );
};
