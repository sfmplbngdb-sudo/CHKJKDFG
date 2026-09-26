import React, { useState, useMemo } from 'react';
import {
  TableProperties,
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  Building2,
  Users,
  MapPin,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ChevronDown,
  Layers,
  ArrowUpDown,
  FileText,
  Zap
} from 'lucide-react';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';
import { PaginationControl } from './common/PaginationControl';
import { VirtualizedTable, VirtualColumn } from './common/VirtualizedTable';

interface MasterReportViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
}

export interface MasterRow {
  id: string;
  index: number;
  loading_date: string;
  month_str: string;
  year_month: string; // YYYY-MM
  so_number: string;
  party_name: string;
  consignor: string;
  consignee: string;
  from_name: string;
  to_name: string;
  lorry_no: string;
  broker_name: string;
  broker_bank: string;
  broker_ifsc: string;
  driver_contact: string;
  // Weight & Rates
  booked_mt: number;
  loaded_mt: number;
  party_rate: number;
  lorry_rate: number;
  // Freight
  total_billed_freight: number; // party rate * final mt or so total
  total_lorry_freight: number;  // lorry rate * final mt
  lm: number;
  pm: number;
  lm_d: number; // record only
  pm_d: number; // record only
  other_loading_exp: number;
  freight_mf: number;
  // Advances & Settlements
  advance: number;
  diesel: number;
  diesel_ref: string;
  other_freight_adj: number;
  balance_due: number;
  // Trip Costs
  trip_expenses: number;
  extra_labour: number;
  total_trip_cost: number;
  // Profitability
  gross_profit: number;
  gp_margin_pct: number;
  // Unloading & Shortage
  unloading_date: string;
  unloaded_mt: number;
  shortage_mt: number;
  shortage_deduction: number;
  // Compliance
  gc_no: string;
  gc_date: string;
  invoice_no: string;
  eway_bill_no: string;
  eway_expiry: string;
  eway_status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING';
  // Account Status
  adv_status: string;
  adv_txn: string;
  bal_status: string;
  bal_txn: string;
  overall_status: 'PENDING' | 'ALLOCATED' | 'DISPATCHED' | 'DELIVERED' | 'SETTLED';
}

type ColumnCategory = 'ALL' | 'OPERATIONS' | 'FREIGHT' | 'SETTLEMENTS' | 'SHORTAGE' | 'COMPLIANCE' | 'MARGINS';

export const MasterReportView: React.FC<MasterReportViewProps> = ({ store, themeStyles }) => {
  const { salesOrders, trips, moneyFreights, unloadings, profits, accounts, parties, places, brokers } = store.state;

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' or 'YYYY-MM'
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [selectedBroker, setSelectedBroker] = useState<string>('ALL');
  const [selectedFrom, setSelectedFrom] = useState<string>('ALL');
  const [selectedTo, setSelectedTo] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedEWayStatus, setSelectedEWayStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<ColumnCategory>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Virtualization & Display Settings (react-window)
  const [viewMode, setViewMode] = useState<'virtual' | 'paged'>('virtual');
  const [rowDensity, setRowDensity] = useState<'compact' | 'normal' | 'relaxed'>('normal');

  const rowHeight = rowDensity === 'compact' ? 38 : rowDensity === 'relaxed' ? 52 : 44;

  // Helper Maps for fast join
  const partyMap = useMemo(() => new Map(parties.map(p => [p.id, p])), [parties]);
  const placeMap = useMemo(() => new Map(places.map(p => [p.id, p.place_name])), [places]);
  const brokerMap = useMemo(() => new Map(brokers.map(b => [b.id, b])), [brokers]);
  const soMap = useMemo(() => new Map(salesOrders.map(s => [s.id, s])), [salesOrders]);
  const soNumMap = useMemo(() => new Map(salesOrders.map(s => [s.so_number, s])), [salesOrders]);

  // Master Row Assembly
  const allMasterRows: MasterRow[] = useMemo(() => {
    const rows: MasterRow[] = [];
    let counter = 1;

    // Process all Trips
    trips.forEach(trip => {
      const so = (trip.so_id ? soMap.get(trip.so_id) : null) || soNumMap.get(trip.so_number);
      const mf = moneyFreights.find(m => (trip.so_id && m.so_id === trip.so_id) || m.so_number === trip.so_number || m.lorry_no === trip.lorry_no);
      const unl = unloadings.find(u => (trip.so_id && u.so_id === trip.so_id) || u.so_number === trip.so_number || (mf && u.mf_no === mf.mf_no));
      const pnl = profits.find(p => (trip.so_id && p.so_id === trip.so_id) || p.so_number === trip.so_number || (mf && p.mf_no === mf.mf_no));
      const acc = accounts.find(a => (mf && a.mf_no === mf.mf_no) || a.lorry_no === trip.lorry_no);
      const broker = trip.broker_id ? brokerMap.get(trip.broker_id) : null;
      const party = so ? partyMap.get(so.party_id) : null;

      const dateStr = trip.loading_date || trip.allocation_date || trip.created_at || (so ? so.created_at : '');
      const parsedDate = dateStr ? new Date(dateStr) : new Date();
      const yearMonth = !isNaN(parsedDate.getTime())
        ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
        : '2026-09';
      const monthStr = !isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleString('default', { month: 'short', year: 'numeric' })
        : 'Sep 2026';

      const bookedMT = so ? so.mt : 0;
      const loadedMT = trip.final_mt || (mf ? mf.final_mt : bookedMT);
      const partyRate = so ? so.rate_received : (mf ? mf.bill_pmt : 0);
      const lorryRate = mf ? mf.pmt_rate : (so ? so.rate_given : 0);

      const totalBilled = mf ? mf.bilti_freight : (partyRate * loadedMT);
      const totalLorry = mf ? mf.total_freight : (lorryRate * loadedMT);

      const lm = mf ? (mf.l_m || 0) : 0;
      const pm = mf ? (mf.p_m || 0) : 0;
      const lm_d = mf ? (mf.lm_d || 0) : 0; // record only
      const pm_d = mf ? (mf.pm_d || 0) : 0; // record only
      const otherLoading = mf ? (mf.other_expense || 0) : 0;
      // Formula: totalLorry - lm - pm + otherLoading (lm_d and pm_d are strictly record only)
      const freightMF = mf ? mf.freight_mf : (totalLorry - lm - pm + otherLoading);

      const advance = mf ? (mf.advance || 0) : 0;
      const diesel = mf ? (mf.diesel || 0) : 0;
      const dieselRef = mf ? (mf.diesel_ref || mf.diesel_card || '') : '';
      const otherFreightAdj = mf ? (mf.other || 0) : 0;
      const balanceDue = mf ? mf.balance : (freightMF - advance - diesel + otherFreightAdj);

      const tripExpenses = mf ? (mf.total_exp || 0) : 0;
      const extraLabour = mf ? (mf.extra_labour || 0) : 0;
      const totalTripCost = pnl ? pnl.total_cost : (mf ? mf.total_cost : (freightMF + tripExpenses + extraLabour));

      const grossProfit = pnl ? pnl.gross_profit : (totalBilled - totalTripCost);
      const gpMarginPct = totalBilled > 0 ? (grossProfit / totalBilled) * 100 : 0;

      // E-Way Bill Expiry Status
      let ewayStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING' = 'MISSING';
      if (trip.eway_expiry) {
        const exp = new Date(trip.eway_expiry).getTime();
        const now = Date.now();
        const diffHours = (exp - now) / (1000 * 60 * 60);
        if (diffHours < 0) ewayStatus = 'EXPIRED';
        else if (diffHours <= 24) ewayStatus = 'EXPIRING';
        else ewayStatus = 'VALID';
      }

      // Overall Status
      let overallStatus: 'PENDING' | 'ALLOCATED' | 'DISPATCHED' | 'DELIVERED' | 'SETTLED' = 'ALLOCATED';
      if (acc && acc.overall_status === 'COMPLETED') {
        overallStatus = 'SETTLED';
      } else if (unl) {
        overallStatus = 'DELIVERED';
      } else if (trip.dispatch_status === 'DISPATCHED') {
        overallStatus = 'DISPATCHED';
      } else {
        overallStatus = 'ALLOCATED';
      }

      const fromName = (so && so.from_id ? placeMap.get(so.from_id) : '') || 'Loading Terminal';
      const toName = trip.destination || (so && so.to_id ? placeMap.get(so.to_id) : '') || 'Unloading Terminal';
      const brokerBank = trip.broker_acc || (broker ? `A/C: ${broker.primary_acc_no}` : 'Direct');
      const brokerIFSC = trip.broker_ifsc || (broker ? broker.ifsc : '');

      rows.push({
        id: `trip-${trip.id}`,
        index: counter++,
        loading_date: dateStr,
        month_str: monthStr,
        year_month: yearMonth,
        so_number: trip.so_number || (so ? so.so_number : '-'),
        party_name: party ? party.party_name : (trip.consignor || 'Direct Client'),
        consignor: trip.consignor || (party ? party.party_name : ''),
        consignee: trip.consignee || trip.destination || '',
        from_name: fromName,
        to_name: toName,
        lorry_no: trip.lorry_no,
        broker_name: broker ? broker.broker_name : (trip.broker_id ? `Broker #${trip.broker_id}` : 'Direct Vehicle'),
        broker_bank: brokerBank,
        broker_ifsc: brokerIFSC,
        driver_contact: trip.driver_contact || 'N/A',
        booked_mt: bookedMT,
        loaded_mt: loadedMT,
        party_rate: partyRate,
        lorry_rate: lorryRate,
        total_billed_freight: totalBilled,
        total_lorry_freight: totalLorry,
        lm,
        pm,
        lm_d,
        pm_d,
        other_loading_exp: otherLoading,
        freight_mf: freightMF,
        advance,
        diesel,
        diesel_ref: dieselRef,
        other_freight_adj: otherFreightAdj,
        balance_due: balanceDue,
        trip_expenses: tripExpenses,
        extra_labour: extraLabour,
        total_trip_cost: totalTripCost,
        gross_profit: grossProfit,
        gp_margin_pct: gpMarginPct,
        unloading_date: unl ? unl.unloading_date : '',
        unloaded_mt: unl ? unl.unloading_mt : 0,
        shortage_mt: unl ? unl.shortage : 0,
        shortage_deduction: unl ? unl.deduction : 0,
        gc_no: trip.gc_no || '',
        gc_date: trip.loading_date || trip.allocation_date || '',
        invoice_no: trip.invoice_no || '',
        eway_bill_no: trip.eway_bill_no || '',
        eway_expiry: trip.eway_expiry || '',
        eway_status: ewayStatus,
        adv_status: acc ? acc.adv_status : (advance > 0 ? 'PENDING' : 'N/A'),
        adv_txn: acc ? (acc.adv_txn_id || '') : '',
        bal_status: acc ? acc.bal_status : 'PENDING',
        bal_txn: acc ? (acc.bal_txn_id || '') : '',
        overall_status: overallStatus
      });
    });

    // Also include any Sales Orders that haven't been allocated yet
    salesOrders.forEach(so => {
      const isAllocated = trips.some(t => t.so_id === so.id || t.so_number === so.so_number);
      if (!isAllocated && so.converted === 'YES') {
        const party = partyMap.get(so.party_id);
        const fromPlace = placeMap.get(so.from_id) || '';
        const toPlace = placeMap.get(so.to_id) || '';
        const parsedDate = so.created_at ? new Date(so.created_at) : new Date();
        const yearMonth = !isNaN(parsedDate.getTime())
          ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
          : '2026-09';
        const monthStr = !isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString('default', { month: 'short', year: 'numeric' })
          : 'Sep 2026';

        const totalBilled = so.mt * so.rate_received;
        const totalLorry = so.mt * so.rate_given;
        const grossMargin = totalBilled - totalLorry;

        rows.push({
          id: `so-${so.id}`,
          index: counter++,
          loading_date: so.created_at,
          month_str: monthStr,
          year_month: yearMonth,
          so_number: so.so_number,
          party_name: party ? party.party_name : 'Quotation Party',
          consignor: party ? party.party_name : '',
          consignee: toPlace,
          from_name: fromPlace,
          to_name: toPlace,
          lorry_no: 'PENDING ALLOCATION',
          broker_name: 'Unassigned',
          broker_bank: '-',
          broker_ifsc: '-',
          driver_contact: '-',
          booked_mt: so.mt,
          loaded_mt: 0,
          party_rate: so.rate_received,
          lorry_rate: so.rate_given,
          total_billed_freight: totalBilled,
          total_lorry_freight: totalLorry,
          lm: 0,
          pm: 0,
          lm_d: 0,
          pm_d: 0,
          other_loading_exp: 0,
          freight_mf: 0,
          advance: 0,
          diesel: 0,
          diesel_ref: '',
          other_freight_adj: 0,
          balance_due: 0,
          trip_expenses: 0,
          extra_labour: 0,
          total_trip_cost: totalLorry,
          gross_profit: grossMargin,
          gp_margin_pct: totalBilled > 0 ? (grossMargin / totalBilled) * 100 : 0,
          unloading_date: '',
          unloaded_mt: 0,
          shortage_mt: 0,
          shortage_deduction: 0,
          gc_no: '',
          gc_date: '',
          invoice_no: '',
          eway_bill_no: '',
          eway_expiry: '',
          eway_status: 'MISSING',
          adv_status: 'N/A',
          adv_txn: '',
          bal_status: 'N/A',
          bal_txn: '',
          overall_status: 'PENDING'
        });
      }
    });

    return rows;
  }, [trips, salesOrders, moneyFreights, unloadings, profits, accounts, partyMap, placeMap, brokerMap, soMap, soNumMap]);

  // Extract distinct months for Month-by-Month Filter
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, { label: string; count: number }>();
    allMasterRows.forEach(row => {
      if (row.year_month) {
        const existing = monthSet.get(row.year_month);
        if (existing) {
          existing.count++;
        } else {
          monthSet.set(row.year_month, { label: row.month_str, count: 1 });
        }
      }
    });
    // Sort descending by YYYY-MM
    return Array.from(monthSet.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allMasterRows]);

  // Distinct Filter Option Lists
  const filterParties = useMemo(() => {
    const list = Array.from(new Set(allMasterRows.map(r => r.party_name))).filter(Boolean);
    return list.sort();
  }, [allMasterRows]);

  const filterBrokers = useMemo(() => {
    const list = Array.from(new Set(allMasterRows.map(r => r.broker_name))).filter(b => b && b !== 'Unassigned');
    return list.sort();
  }, [allMasterRows]);

  const filterOrigins = useMemo(() => {
    const list = Array.from(new Set(allMasterRows.map(r => r.from_name))).filter(Boolean);
    return list.sort();
  }, [allMasterRows]);

  const filterDestinations = useMemo(() => {
    const list = Array.from(new Set(allMasterRows.map(r => r.to_name))).filter(Boolean);
    return list.sort();
  }, [allMasterRows]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return allMasterRows.filter(row => {
      // Month Filter
      if (selectedMonth !== 'ALL' && row.year_month !== selectedMonth) {
        return false;
      }

      // Date Range Filter
      if (fromDate && row.loading_date && row.loading_date.slice(0, 10) < fromDate) {
        return false;
      }
      if (toDate && row.loading_date && row.loading_date.slice(0, 10) > toDate) {
        return false;
      }

      // Party Filter
      if (selectedParty !== 'ALL' && row.party_name !== selectedParty) {
        return false;
      }

      // Broker Filter
      if (selectedBroker !== 'ALL' && row.broker_name !== selectedBroker) {
        return false;
      }

      // Origin & Destination
      if (selectedFrom !== 'ALL' && row.from_name !== selectedFrom) {
        return false;
      }
      if (selectedTo !== 'ALL' && row.to_name !== selectedTo) {
        return false;
      }

      // Operational Status
      if (selectedStatus !== 'ALL' && row.overall_status !== selectedStatus) {
        return false;
      }

      // E-Way Status
      if (selectedEWayStatus !== 'ALL' && row.eway_status !== selectedEWayStatus) {
        return false;
      }

      // Universal Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          row.so_number.toLowerCase().includes(query) ||
          row.lorry_no.toLowerCase().includes(query) ||
          row.party_name.toLowerCase().includes(query) ||
          row.consignee.toLowerCase().includes(query) ||
          row.from_name.toLowerCase().includes(query) ||
          row.to_name.toLowerCase().includes(query) ||
          row.broker_name.toLowerCase().includes(query) ||
          row.driver_contact.toLowerCase().includes(query) ||
          row.gc_no.toLowerCase().includes(query) ||
          row.invoice_no.toLowerCase().includes(query) ||
          row.eway_bill_no.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    allMasterRows,
    selectedMonth,
    fromDate,
    toDate,
    selectedParty,
    selectedBroker,
    selectedFrom,
    selectedTo,
    selectedStatus,
    selectedEWayStatus,
    searchTerm
  ]);

  // Aggregated KPIs for filtered dataset
  const kpis = useMemo(() => {
    const totalCount = filteredRows.length;
    const totalLoadedMT = filteredRows.reduce((sum, r) => sum + (r.loaded_mt || 0), 0);
    const totalRevenue = filteredRows.reduce((sum, r) => sum + (r.total_billed_freight || 0), 0);
    const totalLorryFreight = filteredRows.reduce((sum, r) => sum + (r.freight_mf || 0), 0);
    const totalGrossProfit = filteredRows.reduce((sum, r) => sum + (r.gross_profit || 0), 0);
    const totalBalanceDue = filteredRows.reduce((sum, r) => sum + (r.balance_due || 0), 0);
    const totalShortage = filteredRows.reduce((sum, r) => sum + (r.shortage_mt || 0), 0);
    const avgMarginPct = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return {
      totalCount,
      totalLoadedMT,
      totalRevenue,
      totalLorryFreight,
      totalGrossProfit,
      totalBalanceDue,
      totalShortage,
      avgMarginPct
    };
  }, [filteredRows]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Virtualized Table Column Definitions (react-window)
  const virtualColumns: VirtualColumn<MasterRow>[] = useMemo(() => {
    const cols: VirtualColumn<MasterRow>[] = [
      {
        key: 'index',
        header: '#',
        width: 50,
        sticky: true,
        stickyLeft: 0,
        align: 'center',
        render: (r, idx) => (
          <span className="font-mono text-slate-400 text-[11px]">{r.index || idx + 1}</span>
        )
      },
      {
        key: 'date',
        header: 'Date & Month',
        width: 115,
        render: r => (
          <div>
            <div className="font-mono text-slate-200 text-xs">{r.loading_date ? r.loading_date.slice(0, 10) : '-'}</div>
            <div className="text-[10px] text-slate-400">{r.month_str}</div>
          </div>
        )
      },
      {
        key: 'lorry_no',
        header: 'Lorry No',
        width: 135,
        render: r => (
          <span className="font-mono font-bold text-slate-100">{r.lorry_no}</span>
        )
      }
    ];

    if (activeCategory === 'ALL' || activeCategory === 'OPERATIONS') {
      cols.push(
        {
          key: 'so_number',
          header: 'SO Number',
          width: 130,
          render: r => <span className="font-mono font-semibold text-blue-400">{r.so_number}</span>
        },
        {
          key: 'party_name',
          header: 'Party / Consignor',
          width: 165,
          render: r => <span className="font-medium text-slate-200 truncate block" title={r.party_name}>{r.party_name}</span>
        },
        {
          key: 'consignee',
          header: 'Destination / Consignee',
          width: 155,
          render: r => <span className="text-slate-300 truncate block" title={r.consignee || r.to_name}>{r.consignee || r.to_name}</span>
        },
        {
          key: 'route',
          header: 'Origin Route',
          width: 165,
          render: r => <span className="text-slate-400 text-[11px] truncate block">{r.from_name} → {r.to_name}</span>
        },
        {
          key: 'broker_name',
          header: 'Transporter / Broker',
          width: 150,
          render: r => <span className="text-slate-300 truncate block" title={r.broker_name}>{r.broker_name}</span>
        },
        {
          key: 'driver_contact',
          header: 'Driver Contact',
          width: 120,
          render: r => <span className="font-mono text-slate-400">{r.driver_contact}</span>
        },
        {
          key: 'booked_mt',
          header: 'Booked MT',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{fmtNum(r.booked_mt)} MT</span>
        },
        {
          key: 'loaded_mt',
          header: 'Loaded MT',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono font-bold text-slate-100">{r.loaded_mt > 0 ? `${fmtNum(r.loaded_mt)} MT` : '-'}</span>
        }
      );
    }

    if (activeCategory === 'ALL' || activeCategory === 'FREIGHT') {
      cols.push(
        {
          key: 'party_rate',
          header: 'Party Rate',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.party_rate > 0 ? fmtCurrency(r.party_rate) : '-'}</span>
        },
        {
          key: 'lorry_rate',
          header: 'Lorry Rate',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.lorry_rate > 0 ? fmtCurrency(r.lorry_rate) : '-'}</span>
        },
        {
          key: 'total_billed_freight',
          header: 'Billed Revenue',
          width: 115,
          align: 'right',
          render: r => <span className="font-mono text-slate-200">{r.total_billed_freight > 0 ? fmtCurrency(r.total_billed_freight) : '-'}</span>
        },
        {
          key: 'total_lorry_freight',
          header: 'Gross Freight',
          width: 110,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.total_lorry_freight > 0 ? fmtCurrency(r.total_lorry_freight) : '-'}</span>
        },
        {
          key: 'lm',
          header: 'LM (₹)',
          width: 80,
          align: 'right',
          headerClass: 'text-rose-400',
          render: r => <span className="font-mono text-rose-400">{r.lm > 0 ? `-₹${r.lm}` : '₹0'}</span>
        },
        {
          key: 'pm',
          header: 'PM (₹)',
          width: 80,
          align: 'right',
          headerClass: 'text-rose-400',
          render: r => <span className="font-mono text-rose-400">{r.pm > 0 ? `-₹${r.pm}` : '₹0'}</span>
        },
        {
          key: 'lm_d',
          header: 'LM D (Rec)',
          width: 85,
          align: 'right',
          title: 'Loading Mamul Deduction (Record Only)',
          render: r => <span className="font-mono text-slate-400">{r.lm_d > 0 ? `₹${r.lm_d}` : '-'}</span>
        },
        {
          key: 'pm_d',
          header: 'PM D (Rec)',
          width: 85,
          align: 'right',
          title: 'Passing Mamul Deduction (Record Only)',
          render: r => <span className="font-mono text-slate-400">{r.pm_d > 0 ? `₹${r.pm_d}` : '-'}</span>
        },
        {
          key: 'other_loading_exp',
          header: 'Other Loading',
          width: 105,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.other_loading_exp > 0 ? fmtCurrency(r.other_loading_exp) : '-'}</span>
        },
        {
          key: 'freight_mf',
          header: 'Freight MF',
          width: 115,
          align: 'right',
          headerClass: 'text-emerald-400',
          render: r => <span className="font-mono font-bold text-emerald-400">{r.freight_mf > 0 ? fmtCurrency(r.freight_mf) : '-'}</span>
        }
      );
    }

    if (activeCategory === 'ALL' || activeCategory === 'SETTLEMENTS') {
      cols.push(
        {
          key: 'advance',
          header: 'Advance (₹)',
          width: 105,
          align: 'right',
          render: r => <span className="font-mono text-slate-200">{r.advance > 0 ? fmtCurrency(r.advance) : '-'}</span>
        },
        {
          key: 'diesel',
          header: 'Diesel (₹)',
          width: 105,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.diesel > 0 ? fmtCurrency(r.diesel) : '-'}</span>
        },
        {
          key: 'diesel_ref',
          header: 'Diesel Card / Ref',
          width: 130,
          render: r => <span className="font-mono text-slate-400 text-[11px] truncate block" title={r.diesel_ref}>{r.diesel_ref || '-'}</span>
        },
        {
          key: 'other_freight_adj',
          header: 'Other Adj',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-400">{r.other_freight_adj !== 0 ? fmtCurrency(r.other_freight_adj) : '-'}</span>
        },
        {
          key: 'balance_due',
          header: 'Balance Due',
          width: 115,
          align: 'right',
          headerClass: 'text-amber-400',
          render: r => <span className="font-mono font-bold text-amber-400">{r.balance_due > 0 ? fmtCurrency(r.balance_due) : '-'}</span>
        },
        {
          key: 'broker_bank',
          header: 'Broker Bank A/C',
          width: 160,
          render: r => <span className="font-mono text-slate-400 text-[11px] truncate block" title={r.broker_bank}>{r.broker_bank}</span>
        },
        {
          key: 'broker_ifsc',
          header: 'IFSC Code',
          width: 105,
          render: r => <span className="font-mono text-slate-400 text-[11px]">{r.broker_ifsc || '-'}</span>
        },
        {
          key: 'adv_status',
          header: 'Adv Status',
          width: 95,
          align: 'center',
          render: r => (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              r.adv_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              r.adv_status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-white/5 text-slate-400'
            }`}>
              {r.adv_status}
            </span>
          )
        },
        {
          key: 'bal_status',
          header: 'Bal Status',
          width: 95,
          align: 'center',
          render: r => (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              r.bal_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              r.bal_status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-white/5 text-slate-400'
            }`}>
              {r.bal_status}
            </span>
          )
        }
      );
    }

    if (activeCategory === 'ALL' || activeCategory === 'MARGINS') {
      cols.push(
        {
          key: 'trip_expenses',
          header: 'Trip Expenses',
          width: 105,
          align: 'right',
          render: r => <span className="font-mono text-slate-400">{r.trip_expenses > 0 ? fmtCurrency(r.trip_expenses) : '-'}</span>
        },
        {
          key: 'extra_labour',
          header: 'Extra Labour',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-400">{r.extra_labour > 0 ? fmtCurrency(r.extra_labour) : '-'}</span>
        },
        {
          key: 'total_trip_cost',
          header: 'Total Trip Cost',
          width: 115,
          align: 'right',
          headerClass: 'text-purple-300',
          render: r => <span className="font-mono text-purple-300 font-semibold">{r.total_trip_cost > 0 ? fmtCurrency(r.total_trip_cost) : '-'}</span>
        },
        {
          key: 'gross_profit',
          header: 'Gross Margin (₹)',
          width: 115,
          align: 'right',
          headerClass: 'text-emerald-400',
          render: r => <span className="font-mono font-bold text-emerald-400">{fmtCurrency(r.gross_profit)}</span>
        },
        {
          key: 'gp_margin_pct',
          header: 'GP On Sale %',
          width: 95,
          align: 'right',
          headerClass: 'text-emerald-300',
          render: r => <span className="font-mono font-bold text-emerald-300">{r.gp_margin_pct.toFixed(2)}%</span>
        }
      );
    }

    if (activeCategory === 'ALL' || activeCategory === 'SHORTAGE') {
      cols.push(
        {
          key: 'unloading_date',
          header: 'Unloading Date',
          width: 105,
          render: r => <span className="font-mono text-slate-400">{r.unloading_date ? r.unloading_date.slice(0, 10) : '-'}</span>
        },
        {
          key: 'unloaded_mt',
          header: 'Unloaded MT',
          width: 95,
          align: 'right',
          render: r => <span className="font-mono text-slate-300">{r.unloaded_mt > 0 ? `${fmtNum(r.unloaded_mt)} MT` : '-'}</span>
        },
        {
          key: 'shortage_mt',
          header: 'Shortage (MT)',
          width: 95,
          align: 'right',
          headerClass: 'text-rose-400',
          render: r => <span className="font-mono text-rose-400 font-semibold">{r.shortage_mt > 0 ? `${fmtNum(r.shortage_mt)} MT` : '0 MT'}</span>
        },
        {
          key: 'shortage_deduction',
          header: 'Shortage Ded (₹)',
          width: 105,
          align: 'right',
          headerClass: 'text-rose-400',
          render: r => <span className="font-mono text-rose-400 font-semibold">{r.shortage_deduction > 0 ? fmtCurrency(r.shortage_deduction) : '₹0'}</span>
        }
      );
    }

    if (activeCategory === 'ALL' || activeCategory === 'COMPLIANCE') {
      cols.push(
        {
          key: 'gc_no',
          header: 'GC / Bilty #',
          width: 110,
          render: r => <span className="font-mono font-semibold text-slate-200">{r.gc_no || '-'}</span>
        },
        {
          key: 'invoice_no',
          header: 'Tax Invoice #',
          width: 115,
          render: r => <span className="font-mono text-slate-300">{r.invoice_no || '-'}</span>
        },
        {
          key: 'eway_bill_no',
          header: 'E-Way Bill #',
          width: 125,
          render: r => <span className="font-mono text-slate-300">{r.eway_bill_no || '-'}</span>
        },
        {
          key: 'eway_status',
          header: 'E-Way Status',
          width: 105,
          align: 'center',
          render: r => (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              r.eway_status === 'VALID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              r.eway_status === 'EXPIRING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              r.eway_status === 'EXPIRED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              'bg-white/5 text-slate-400'
            }`}>
              {r.eway_status}
            </span>
          )
        }
      );
    }

    cols.push({
      key: 'overall_status',
      header: 'Overall Status',
      width: 115,
      align: 'center',
      render: r => (
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
          r.overall_status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
          r.overall_status === 'DELIVERED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
          r.overall_status === 'DISPATCHED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
          r.overall_status === 'ALLOCATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        }`}>
          {r.overall_status}
        </span>
      )
    });

    return cols;
  }, [activeCategory]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedMonth('ALL');
    setFromDate('');
    setToDate('');
    setSelectedParty('ALL');
    setSelectedBroker('ALL');
    setSelectedFrom('ALL');
    setSelectedTo('ALL');
    setSelectedStatus('ALL');
    setSelectedEWayStatus('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Comprehensive Excel Export with all columns
  const handleExportMasterExcel = () => {
    const exportDataset = filteredRows.map(r => ({
      Index: r.index,
      Date: r.loading_date ? r.loading_date.slice(0, 10) : '',
      Month: r.month_str,
      SO_Number: r.so_number,
      Party_Consignor: r.party_name,
      Consignee_Destination: r.consignee,
      Loading_Origin: r.from_name,
      Delivery_Destination: r.to_name,
      Lorry_Number: r.lorry_no,
      Transporter_Broker: r.broker_name,
      Broker_Bank_Details: r.broker_bank,
      Broker_IFSC: r.broker_ifsc,
      Driver_Mobile: r.driver_contact,
      Booked_MT: r.booked_mt,
      Loaded_MT: r.loaded_mt,
      Party_Rate_PMT: r.party_rate,
      Lorry_Rate_PMT: r.lorry_rate,
      Total_Billed_Freight: r.total_billed_freight,
      Gross_Lorry_Freight: r.total_lorry_freight,
      LM_Loading_Mamul: r.lm,
      PM_Passing_Mamul: r.pm,
      LM_D_Record_Only: r.lm_d,
      PM_D_Record_Only: r.pm_d,
      Other_Loading_Exp: r.other_loading_exp,
      Freight_MF_Net: r.freight_mf,
      Advance_Paid: r.advance,
      Diesel_Amount: r.diesel,
      Diesel_Ref_Card: r.diesel_ref,
      Other_Freight_Adjustments: r.other_freight_adj,
      Transporter_Balance_Due: r.balance_due,
      Trip_Expenses: r.trip_expenses,
      Extra_Labour: r.extra_labour,
      Total_Trip_Cost: r.total_trip_cost,
      Gross_Profit_Margin: r.gross_profit,
      Margin_Percentage: Number(r.gp_margin_pct.toFixed(2)),
      Unloading_Date: r.unloading_date ? r.unloading_date.slice(0, 10) : '',
      Unloaded_MT: r.unloaded_mt,
      Shortage_MT: r.shortage_mt,
      Shortage_Deduction: r.shortage_deduction,
      GC_Bilty_No: r.gc_no,
      Tax_Invoice_No: r.invoice_no,
      EWay_Bill_No: r.eway_bill_no,
      EWay_Expiry: r.eway_expiry ? r.eway_expiry.slice(0, 10) : '',
      EWay_Status: r.eway_status,
      Advance_Payout_Status: r.adv_status,
      Advance_Txn_UTR: r.adv_txn,
      Balance_Payout_Status: r.bal_status,
      Balance_Txn_UTR: r.bal_txn,
      Overall_Status: r.overall_status
    }));

    const dateTag = new Date().toISOString().slice(0, 10);
    const monthTag = selectedMonth !== 'ALL' ? `_${selectedMonth}` : '';
    exportToExcel(exportDataset, `SFMPL_All_In_One_Master_Report${monthTag}_${dateTag}`);
  };

  return (
    <div className="space-y-5 p-4 lg:p-8 max-w-[100rem] mx-auto">
      {/* Header Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-blue-400" />
            <h2 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Master Report — All-in-One Operations & Freight Register
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consolidated operational manifest, weighbridge tonnage, LM/PM mamul records, settlements, compliance, and P&L balance sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>

          <button
            onClick={handleExportMasterExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs transition-colors"
            title="Download full register in .xlsx format"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Master Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Month-by-Month Filter Toolbar */}
      <div className={`p-3.5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>Month-by-Month Quick Filter:</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing: {selectedMonth === 'ALL' ? 'All Months' : availableMonths.find(m => m[0] === selectedMonth)?.[1].label || selectedMonth} ({filteredRows.length} trips)
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => {
              setSelectedMonth('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedMonth === 'ALL'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            All Months ({allMasterRows.length})
          </button>

          {availableMonths.map(([ym, { label, count }]) => (
            <button
              key={ym}
              onClick={() => {
                setSelectedMonth(ym);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedMonth === ym
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {label} <span className="text-[10px] opacity-75 font-mono ml-0.5">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Multi-Filter Drawer */}
      {showFilters && (
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-blue-400" />
              <span>Multi-Dimensional Transport & Route Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset All Filters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Universal Search */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Universal Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Lorry #, SO #, Party, Broker, Driver, GC #, Invoice #..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
                />
              </div>
            </div>

            {/* Date Range: From & To */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-1.5 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              />
            </div>

            {/* Party Filter */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Party / Consignor</label>
              <select
                value={selectedParty}
                onChange={e => {
                  setSelectedParty(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Parties ({filterParties.length})</option>
                {filterParties.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Transporter / Broker Filter */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Transporter / Broker</label>
              <select
                value={selectedBroker}
                onChange={e => {
                  setSelectedBroker(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Brokers ({filterBrokers.length})</option>
                {filterBrokers.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Origin Terminal */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Loading Origin</label>
              <select
                value={selectedFrom}
                onChange={e => {
                  setSelectedFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Loading Points ({filterOrigins.length})</option>
                {filterOrigins.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Destination Hub */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Unloading Hub</label>
              <select
                value={selectedTo}
                onChange={e => {
                  setSelectedTo(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Destinations ({filterDestinations.length})</option>
                {filterDestinations.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Operational Status Filter */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Operational Status</label>
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="PENDING">PENDING (Quotation)</option>
                <option value="ALLOCATED">ALLOCATED (Vehicle In-Yard)</option>
                <option value="DISPATCHED">DISPATCHED (In-Transit)</option>
                <option value="DELIVERED">DELIVERED (Unloaded)</option>
                <option value="SETTLED">SETTLED (Paid in Full)</option>
              </select>
            </div>

            {/* E-Way Bill Compliance */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">E-Way Bill Compliance</label>
              <select
                value={selectedEWayStatus}
                onChange={e => {
                  setSelectedEWayStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
              >
                <option value="ALL">All Compliance States</option>
                <option value="VALID">VALID (Active E-Way)</option>
                <option value="EXPIRING">EXPIRING (&lt; 24h Left)</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="MISSING">MISSING (Pending)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Executive KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL ORDERS</span>
          <span className="font-mono text-slate-100 font-bold text-base">{kpis.totalCount}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">TOTAL LOADED MT</span>
          <span className="font-mono text-blue-400 font-bold text-base">{fmtNum(kpis.totalLoadedMT)} MT</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">BILLED REVENUE</span>
          <span className="font-mono text-emerald-400 font-bold text-base">{fmtCurrency(kpis.totalRevenue)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">FREIGHT MF</span>
          <span className="font-mono text-slate-200 font-bold text-base">{fmtCurrency(kpis.totalLorryFreight)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">NET MARGIN (₹)</span>
          <span className="font-mono text-emerald-300 font-bold text-base">{fmtCurrency(kpis.totalGrossProfit)}</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">GP ON SALES %</span>
          <span className="font-mono text-purple-400 font-bold text-base">{kpis.avgMarginPct.toFixed(2)}%</span>
        </div>
        <div className={`p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <span className="text-[10px] text-slate-400 font-mono block">PENDING BALANCE</span>
          <span className="font-mono text-amber-400 font-bold text-base">{fmtCurrency(kpis.totalBalanceDue)}</span>
        </div>
      </div>

      {/* Table Display Control & Benchmarking Toolbar */}
      <div className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        {/* Left: Mode Switcher & Density */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Virtual Mode Switcher */}
          <div className="flex items-center rounded-lg bg-black/30 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('virtual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'virtual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Virtual Stream (react-window)</span>
            </button>
            <button
              onClick={() => setViewMode('paged')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'paged'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Standard Paged Grid</span>
            </button>
          </div>

          {/* Row Density (Applies to Virtual Table) */}
          {viewMode === 'virtual' && (
            <div className="flex items-center rounded-lg bg-black/30 p-1 border border-white/10 text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Density:</span>
              <button
                onClick={() => setRowDensity('compact')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  rowDensity === 'compact' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Compact (38px)
              </button>
              <button
                onClick={() => setRowDensity('normal')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  rowDensity === 'normal' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normal (44px)
              </button>
              <button
                onClick={() => setRowDensity('relaxed')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  rowDensity === 'relaxed' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Relaxed (52px)
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Records Count */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-200 font-mono">{filteredRows.length}</strong> consignments
          </span>
        </div>
      </div>

      {/* Column Category View Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-[11px] font-semibold mr-1 flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          Focus:
        </span>
        {[
          { id: 'ALL', label: 'All Columns (Master 40+)' },
          { id: 'OPERATIONS', label: 'Operations & Route' },
          { id: 'FREIGHT', label: 'Freight & Mamul' },
          { id: 'SETTLEMENTS', label: 'Transporter Bank & Balances' },
          { id: 'SHORTAGE', label: 'Weighbridge & Shortage' },
          { id: 'COMPLIANCE', label: 'Compliance & E-Way' },
          { id: 'MARGINS', label: 'Margins & P&L' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as ColumnCategory)}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-black/20 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Consolidated Master Table: Virtual Window or Paged Grid */}
      {viewMode === 'virtual' ? (
        <VirtualizedTable<MasterRow>
          data={filteredRows}
          columns={virtualColumns}
          height={620}
          rowHeight={rowHeight}
          themeStyles={themeStyles}
          emptyMessage="No matching consignments found for selected filters"
        />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                {/* Index & Identifiers */}
                <th className="py-3 px-3 w-12 text-center font-mono sticky left-0 z-30 bg-slate-900 border-r border-white/10">#</th>
                <th className="py-3 px-3 font-semibold">DATE & MONTH</th>
                <th className="py-3 px-4 font-semibold">LORRY NO</th>

                {/* Operations & Identifiers */}
                {(activeCategory === 'ALL' || activeCategory === 'OPERATIONS') && (
                  <>
                    <th className="py-3 px-4 font-semibold">SO NUMBER</th>
                    <th className="py-3 px-4 font-semibold">PARTY / CONSIGNOR</th>
                    <th className="py-3 px-4 font-semibold">DESTINATION / CONSIGNEE</th>
                    <th className="py-3 px-4 font-semibold">ORIGIN ROUTE</th>
                    <th className="py-3 px-4 font-semibold">TRANSPORTER / BROKER</th>
                    <th className="py-3 px-4 font-semibold">DRIVER CONTACT</th>
                    <th className="py-3 px-4 font-semibold text-right">BOOKED MT</th>
                    <th className="py-3 px-4 font-semibold text-right">LOADED MT</th>
                  </>
                )}

                {/* Rates & Freight Math */}
                {(activeCategory === 'ALL' || activeCategory === 'FREIGHT') && (
                  <>
                    <th className="py-3 px-4 font-semibold text-right">PARTY RATE</th>
                    <th className="py-3 px-4 font-semibold text-right">LORRY RATE</th>
                    <th className="py-3 px-4 font-semibold text-right">BILLED REVENUE</th>
                    <th className="py-3 px-4 font-semibold text-right">GROSS FREIGHT</th>
                    <th className="py-3 px-4 font-semibold text-right text-rose-400">LM (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right text-rose-400">PM (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right text-slate-400" title="Loading Mamul Deduction (Record Only)">LM D (REC)</th>
                    <th className="py-3 px-4 font-semibold text-right text-slate-400" title="Passing Mamul Deduction (Record Only)">PM D (REC)</th>
                    <th className="py-3 px-4 font-semibold text-right">OTHER LOADING</th>
                    <th className="py-3 px-4 font-semibold text-right font-bold text-emerald-400">FREIGHT MF</th>
                  </>
                )}

                {/* Settlements & Banking */}
                {(activeCategory === 'ALL' || activeCategory === 'SETTLEMENTS') && (
                  <>
                    <th className="py-3 px-4 font-semibold text-right">ADVANCE (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right">DIESEL (₹)</th>
                    <th className="py-3 px-4 font-semibold">DIESEL CARD / REF</th>
                    <th className="py-3 px-4 font-semibold text-right">OTHER FREIGHT ADJ</th>
                    <th className="py-3 px-4 font-semibold text-right font-bold text-amber-400">BALANCE DUE</th>
                    <th className="py-3 px-4 font-semibold">BROKER BANK A/C</th>
                    <th className="py-3 px-4 font-semibold">IFSC CODE</th>
                    <th className="py-3 px-4 font-semibold text-center">ADV STATUS</th>
                    <th className="py-3 px-4 font-semibold text-center">BAL STATUS</th>
                  </>
                )}

                {/* Trip Expenses & Margins */}
                {(activeCategory === 'ALL' || activeCategory === 'MARGINS') && (
                  <>
                    <th className="py-3 px-4 font-semibold text-right">TRIP EXPENSES</th>
                    <th className="py-3 px-4 font-semibold text-right">EXTRA LABOUR</th>
                    <th className="py-3 px-4 font-semibold text-right text-purple-400">TOTAL TRIP COST</th>
                    <th className="py-3 px-4 font-semibold text-right text-emerald-400 font-bold">GROSS MARGIN (₹)</th>
                    <th className="py-3 px-4 font-semibold text-right text-emerald-300 font-bold">GP ON SALE %</th>
                  </>
                )}

                {/* Weighbridge Unloading & Shortage */}
                {(activeCategory === 'ALL' || activeCategory === 'SHORTAGE') && (
                  <>
                    <th className="py-3 px-4 font-semibold">UNLOADING DATE</th>
                    <th className="py-3 px-4 font-semibold text-right">UNLOADED MT</th>
                    <th className="py-3 px-4 font-semibold text-right text-rose-400">SHORTAGE (MT)</th>
                    <th className="py-3 px-4 font-semibold text-right text-rose-400">SHORTAGE DED (₹)</th>
                  </>
                )}

                {/* Compliance & E-Way */}
                {(activeCategory === 'ALL' || activeCategory === 'COMPLIANCE') && (
                  <>
                    <th className="py-3 px-4 font-semibold">GC / BILTY #</th>
                    <th className="py-3 px-4 font-semibold">TAX INVOICE #</th>
                    <th className="py-3 px-4 font-semibold">E-WAY BILL #</th>
                    <th className="py-3 px-4 font-semibold text-center">E-WAY STATUS</th>
                  </>
                )}

                {/* Final Master Status */}
                <th className="py-3 px-4 font-semibold text-center">OVERALL STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={40} className="py-16 text-center text-slate-400">
                    <TableProperties className="h-10 w-10 mx-auto opacity-30 mb-2" />
                    <p className="text-sm font-semibold">No records match the active filters</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting the month or adjusting your search parameters</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, idx) => {
                  const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={r.id} className={themeStyles.tableRowHover}>
                      {/* Sticky Left Columns */}
                      <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px] sticky left-0 z-10 bg-slate-900 border-r border-white/10">
                        {rowIndex}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-200 text-xs">
                          {r.loading_date ? r.loading_date.slice(0, 10) : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">{r.month_str}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">
                        {r.lorry_no}
                      </td>

                      {/* Operations Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'OPERATIONS') && (
                        <>
                          <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                            {r.so_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {r.party_name}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {r.consignee || r.to_name}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {r.from_name} <span className="text-slate-600">→</span> {r.to_name}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {r.broker_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {r.driver_contact}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {fmtNum(r.booked_mt)} MT
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                            {r.loaded_mt > 0 ? `${fmtNum(r.loaded_mt)} MT` : '-'}
                          </td>
                        </>
                      )}

                      {/* Rates & Freight Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'FREIGHT') && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.party_rate > 0 ? fmtCurrency(r.party_rate) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.lorry_rate > 0 ? fmtCurrency(r.lorry_rate) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">
                            {r.total_billed_freight > 0 ? fmtCurrency(r.total_billed_freight) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.total_lorry_freight > 0 ? fmtCurrency(r.total_lorry_freight) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-400">
                            {r.lm > 0 ? `-₹${r.lm}` : '₹0'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-400">
                            {r.pm > 0 ? `-₹${r.pm}` : '₹0'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {r.lm_d > 0 ? `₹${r.lm_d}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {r.pm_d > 0 ? `₹${r.pm_d}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.other_loading_exp > 0 ? fmtCurrency(r.other_loading_exp) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {r.freight_mf > 0 ? fmtCurrency(r.freight_mf) : '-'}
                          </td>
                        </>
                      )}

                      {/* Settlements Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'SETTLEMENTS') && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">
                            {r.advance > 0 ? fmtCurrency(r.advance) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.diesel > 0 ? fmtCurrency(r.diesel) : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {r.diesel_ref || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {r.other_freight_adj !== 0 ? fmtCurrency(r.other_freight_adj) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                            {r.balance_due > 0 ? fmtCurrency(r.balance_due) : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {r.broker_bank}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {r.broker_ifsc || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              r.adv_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              r.adv_status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-white/5 text-slate-400'
                            }`}>
                              {r.adv_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              r.bal_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              r.bal_status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-white/5 text-slate-400'
                            }`}>
                              {r.bal_status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Margins Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'MARGINS') && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {r.trip_expenses > 0 ? fmtCurrency(r.trip_expenses) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {r.extra_labour > 0 ? fmtCurrency(r.extra_labour) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-purple-300 font-semibold">
                            {r.total_trip_cost > 0 ? fmtCurrency(r.total_trip_cost) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {fmtCurrency(r.gross_profit)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                            {r.gp_margin_pct.toFixed(2)}%
                          </td>
                        </>
                      )}

                      {/* Shortage Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'SHORTAGE') && (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {r.unloading_date ? r.unloading_date.slice(0, 10) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {r.unloaded_mt > 0 ? `${fmtNum(r.unloaded_mt)} MT` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-400 font-semibold">
                            {r.shortage_mt > 0 ? `${fmtNum(r.shortage_mt)} MT` : '0 MT'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-400 font-semibold">
                            {r.shortage_deduction > 0 ? fmtCurrency(r.shortage_deduction) : '₹0'}
                          </td>
                        </>
                      )}

                      {/* Compliance Columns */}
                      {(activeCategory === 'ALL' || activeCategory === 'COMPLIANCE') && (
                        <>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                            {r.gc_no || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {r.invoice_no || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {r.eway_bill_no || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              r.eway_status === 'VALID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              r.eway_status === 'EXPIRING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              r.eway_status === 'EXPIRED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-white/5 text-slate-400'
                            }`}>
                              {r.eway_status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Master Operational Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider ${
                          r.overall_status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          r.overall_status === 'DELIVERED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          r.overall_status === 'DISPATCHED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                          r.overall_status === 'ALLOCATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {r.overall_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Indexing Pagination Control */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          themeStyles={themeStyles}
        />
      </div>
      )}
    </div>
  );
};

export default MasterReportView;
