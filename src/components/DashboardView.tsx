import React from 'react';
import {
  TrendingUp,
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  CreditCard,
  PlusCircle,
  FileDown
} from 'lucide-react';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';
import { ActiveTab } from './Sidebar';
import { ProjectedProfitChart } from './ProjectedProfitChart';

interface DashboardViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onNavigate: (tab: ActiveTab) => void;
  onOpenCreateSO: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  store,
  themeStyles,
  onNavigate,
  onOpenCreateSO
}) => {
  const { salesOrders, trips, moneyFreights, profits, accounts, parties } = store.state;

  // Compute live KPIs
  const totalOrders = salesOrders.length;
  const convertedOrders = salesOrders.filter(s => s.converted === 'YES').length;
  const totalMT = salesOrders.reduce((sum, s) => sum + s.mt, 0);

  const totalRevenue = profits.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalCost = profits.reduce((sum, p) => sum + p.total_cost, 0);
  const totalGrossProfit = profits.reduce((sum, p) => sum + p.gross_profit, 0);
  const avgGPMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const runningTrips = trips.filter(t => t.trip_status === 'RUNNING');
  const completedTrips = trips.filter(t => t.trip_status === 'COMPLETED');

  const pendingAdvancePayouts = accounts.filter(a => a.adv_status === 'PENDING').length;
  const pendingBalancePayouts = accounts.filter(a => a.bal_status === 'PENDING' && a.adv_status === 'ADV_PAID').length;
  const totalOutstandingBalance = accounts.reduce((sum, a) => {
    const balDue = (a.balance_amount || 0) - (a.bal_paid_amount || 0);
    return sum + (balDue > 0 ? balDue : 0);
  }, 0);

  // Workflow pipeline counts
  const pipeline = [
    { label: 'Registered SOs', count: salesOrders.length, desc: 'Sales order book', tab: 'sales-orders' as ActiveTab },
    { label: 'Vehicle Allocated', count: salesOrders.filter(s => s.allocated).length, desc: 'Lorry assigned', tab: 'trip-allocation' as ActiveTab },
    { label: 'Cargo Dispatched', count: trips.filter(t => t.dispatch_status === 'DISPATCHED').length, desc: 'With GC & E-Way', tab: 'dispatch' as ActiveTab },
    { label: 'MF Manifested', count: moneyFreights.length, desc: 'PMT & diesel computed', tab: 'money-freight' as ActiveTab },
    { label: 'Audited & Settled', count: accounts.filter(a => a.overall_status === 'COMPLETED').length, desc: 'Full payment clear', tab: 'account' as ActiveTab }
  ];

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner with Quick Actions */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Logistics Fleet Control Station
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime rate margins, vehicle allocations, fuel allowances, and freight settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenCreateSO}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Sales Order</span>
          </button>
          <button
            onClick={() => onNavigate('trip-allocation')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${themeStyles.textSecondary} hover:bg-white/5 border-white/10`}
          >
            <Truck className="h-4 w-4 text-blue-400" />
            <span>Allocate Lorry</span>
          </button>
          <button
            onClick={() => exportToExcel(salesOrders, 'SFMPL_Orders_Summary')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-slate-400 hover:text-slate-200 border-white/10 hover:bg-white/5`}
            title="Download Excel Summary"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Freight Revenue</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {fmtCurrency(totalRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Total Cost: {fmtCurrency(totalCost)}</span>
            <span className="text-emerald-400 font-mono font-medium">
              +{avgGPMargin.toFixed(1)}% GP
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Order Book Volume</span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {fmtNum(totalMT)} <span className="text-sm font-sans font-normal text-slate-400">MT</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{convertedOrders} Converted to SO</span>
            <span className="font-mono text-slate-300">{totalOrders} Registered</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Fleets on Road</span>
            <Truck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {runningTrips.length} <span className="text-sm font-sans font-normal text-slate-400">Vehicles</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{completedTrips.length} Completed Trips</span>
            <span className="text-blue-400">Live Transit</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Outstanding Balance</span>
            <CreditCard className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {fmtCurrency(totalOutstandingBalance)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{pendingBalancePayouts} Settlements Due</span>
            <span className="text-amber-400 font-medium">Pending Payout</span>
          </div>
        </div>
      </div>

      {/* Projected Profit Trends (Active Money Freight Model) */}
      <ProjectedProfitChart
        moneyFreights={moneyFreights}
        trips={trips}
        salesOrders={salesOrders}
        profits={profits}
        themeStyles={themeStyles}
        onNavigateToMF={() => onNavigate('money-freight')}
        onNavigateToProfit={() => onNavigate('profit')}
      />

      {/* Operations Pipeline Visualizer */}
      <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${themeStyles.textPrimary}`}>
              End-to-End Logistics Pipeline Progress
            </h3>
            <p className="text-xs text-slate-400">Real-time status of orders progressing through the TMS pipeline</p>
          </div>
          <span className="text-xs font-mono text-blue-400">{salesOrders.length} Active Records</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pipeline.map((stage, idx) => (
            <button
              key={stage.label}
              onClick={() => onNavigate(stage.tab)}
              className="p-3.5 rounded-lg border border-white/5 bg-black/20 hover:border-blue-500/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">0{idx + 1}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-100">
                {stage.count}
              </div>
              <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                {stage.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {stage.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Active Trips on Road + Financial Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Trips on the Road (2 cols) */}
        <div className={`lg:col-span-2 p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${themeStyles.textPrimary}`}>
                Live Running Dispatches
              </h3>
              <p className="text-xs text-slate-400">Vehicles loaded and currently in transit</p>
            </div>
            <button
              onClick={() => onNavigate('dispatch')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              View All Dispatches ›
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} text-slate-400 text-[11px]`}>
                  <th className="py-2.5 px-3 font-semibold">SO & LORRY</th>
                  <th className="py-2.5 px-3 font-semibold">ROUTE & DESTINATION</th>
                  <th className="py-2.5 px-3 font-semibold">E-WAY & GC</th>
                  <th className="py-2.5 px-3 font-semibold text-right">WEIGHT</th>
                  <th className="py-2.5 px-3 font-semibold text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.slice(0, 5).map(trip => (
                  <tr key={trip.id} className={themeStyles.tableRowHover}>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100">{trip.lorry_no}</div>
                      <div className="text-[11px] font-mono text-blue-400">{trip.so_number}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200 truncate max-w-[200px]">{trip.consignor}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">→ {trip.destination || trip.consignee}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-300">{trip.gc_no || 'Pending GC'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Exp: {fmtDate(trip.eway_expiry)}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200 tabular-nums">
                      {trip.final_mt ? `${trip.final_mt} MT` : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        trip.trip_status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {trip.trip_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout & Settlement Alerts (1 col) */}
        <div className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${themeStyles.textPrimary}`}>
                Settlements Overview
              </h3>
              <CreditCard className="h-4 w-4 text-blue-400" />
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-white/5 bg-black/20">
                <div className="text-xs text-slate-400">Total Manifested Freight</div>
                <div className="text-lg font-bold font-mono text-slate-100 mt-1">
                  {fmtCurrency(moneyFreights.reduce((s, m) => s + m.total_freight, 0))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>Advances Paid:</span>
                  <span className="font-mono text-slate-200">
                    {fmtCurrency(moneyFreights.reduce((s, m) => s + m.advance, 0))}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Diesel Distributed:</span>
                  <span className="font-mono text-slate-200">
                    {fmtCurrency(moneyFreights.reduce((s, m) => s + m.diesel, 0))}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-white/5 bg-black/20">
                <div className="text-xs text-slate-400">Pending Balance Authorizations</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-2xl font-bold font-mono text-amber-400">
                    {pendingBalancePayouts}
                  </span>
                  <button
                    onClick={() => onNavigate('account')}
                    className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  >
                    Settle Balances
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Parties in Database:</span>
              <span className="font-mono font-bold text-slate-200">{parties.length} Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
