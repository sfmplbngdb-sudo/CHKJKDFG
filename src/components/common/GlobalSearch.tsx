import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  FileSpreadsheet,
  Truck,
  Receipt,
  Users,
  Building2,
  MapPin,
  ArrowRight,
  TrendingUp,
  CreditCard,
  CornerDownLeft,
  Command,
  FileText
} from 'lucide-react';
import { useTMSStore } from '../../store/useTMSStore';
import { ThemeStyles } from '../../utils/theme';
import { ActiveTab } from '../Sidebar';
import { fmtCurrency, fmtNum, fmtDate } from '../../utils/formatters';

interface GlobalSearchProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  onNavigate: (tab: ActiveTab) => void;
}

type SearchCategory = 'ALL' | 'ORDERS' | 'FLEET' | 'MF' | 'PARTIES' | 'BROKERS';

interface SearchResultItem {
  id: string;
  type: 'order' | 'trip' | 'mf' | 'party' | 'broker';
  tab: ActiveTab;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  tag: string;
  details?: string;
  amount?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  store,
  themeStyles,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const { salesOrders, trips, moneyFreights, parties, brokers, places } = store.state;

  const partyMap = useMemo(() => new Map(parties.map(p => [p.id, p.party_name])), [parties]);
  const placeMap = useMemo(() => new Map(places.map(pl => [pl.id, pl.place_name])), [places]);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setActiveCategory('ALL');
    }
  }, [isOpen]);

  // Index search records
  const allResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Sales Orders
    salesOrders.forEach(so => {
      const partyName = partyMap.get(so.party_id) || '';
      const fromPlace = placeMap.get(so.from_id) || '';
      const toPlace = placeMap.get(so.to_id) || '';
      const partyRate = so.rate_received;
      const lorryRate = so.rate_given;

      const match =
        so.so_number.toLowerCase().includes(q) ||
        partyName.toLowerCase().includes(q) ||
        fromPlace.toLowerCase().includes(q) ||
        toPlace.toLowerCase().includes(q) ||
        (so.remarks && so.remarks.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `so-${so.id}`,
          type: 'order',
          tab: 'sales-orders',
          title: so.so_number,
          subtitle: `${partyName || 'Party'} — ${fromPlace || 'Origin'} → ${toPlace || 'Destination'}`,
          badge: 'SALES ORDER',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          tag: so.converted === 'YES' ? 'CONVERTED' : 'PENDING',
          details: `${so.mt} MT | Party Rate: ${fmtCurrency(partyRate)}/MT | Lorry Rate: ${fmtCurrency(lorryRate)}/MT`,
          amount: fmtCurrency(so.mt * partyRate)
        });
      }
    });

    // 2. Trips / Fleet Dispatches
    trips.forEach(t => {
      const match =
        t.lorry_no.toLowerCase().includes(q) ||
        (t.so_number && t.so_number.toLowerCase().includes(q)) ||
        (t.driver_contact && t.driver_contact.includes(q)) ||
        (t.gc_no && t.gc_no.toLowerCase().includes(q)) ||
        (t.eway_bill_no && t.eway_bill_no.toLowerCase().includes(q)) ||
        (t.consignor && t.consignor.toLowerCase().includes(q)) ||
        (t.consignee && t.consignee.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `trip-${t.id}`,
          type: 'trip',
          tab: 'dispatch',
          title: t.lorry_no,
          subtitle: `${t.consignor || 'Origin'} → ${t.destination || t.consignee || 'Destination'} | Driver Phone: ${t.driver_contact || '-'}`,
          badge: 'VEHICLE / TRIP',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          tag: t.dispatch_status || t.trip_status,
          details: `GC: ${t.gc_no || 'Pending'} | E-Way: ${t.eway_bill_no || 'Pending'} | Loaded MT: ${t.final_mt || '-'}`
        });
      }
    });

    // 3. Money Freight (MF)
    moneyFreights.forEach(mf => {
      const match =
        mf.mf_no.toLowerCase().includes(q) ||
        mf.lorry_no.toLowerCase().includes(q) ||
        (mf.so_number && mf.so_number.toLowerCase().includes(q)) ||
        (mf.loading_point && mf.loading_point.toLowerCase().includes(q)) ||
        (mf.loading_clerk && mf.loading_clerk.toLowerCase().includes(q)) ||
        (mf.diesel_card && mf.diesel_card.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `mf-${mf.id}`,
          type: 'mf',
          tab: 'money-freight',
          title: mf.mf_no,
          subtitle: `Lorry: ${mf.lorry_no} | SO: ${mf.so_number || '-'} | Pt: ${mf.loading_point || '-'}`,
          badge: 'MONEY FREIGHT',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          tag: `BAL: ${fmtCurrency(mf.balance)}`,
          details: `Net Freight: ${fmtCurrency(mf.freight_mf)} | Adv: ${fmtCurrency(mf.advance)} | Diesel: ${fmtCurrency(mf.diesel)}`,
          amount: fmtCurrency(mf.freight_mf)
        });
      }
    });

    // 4. Parties & Consignors
    parties.forEach(p => {
      const match =
        p.party_name.toLowerCase().includes(q) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.gst && p.gst.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `party-${p.id}`,
          type: 'party',
          tab: 'parties',
          title: p.party_name,
          subtitle: `GSTIN: ${p.gst || 'N/A'} | Contact: ${p.contact || '-'}`,
          badge: 'PARTY / CLIENT',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          tag: p.status,
          details: `GST: ${p.gst || 'N/A'} | Phone: ${p.contact || '-'}`
        });
      }
    });

    // 5. Brokers / Transporters
    brokers.forEach(b => {
      const match =
        b.broker_name.toLowerCase().includes(q) ||
        (b.contact_no && b.contact_no.includes(q)) ||
        (b.primary_acc_no && b.primary_acc_no.includes(q)) ||
        (b.ifsc && b.ifsc.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `broker-${b.id}`,
          type: 'broker',
          tab: 'brokers',
          title: b.broker_name,
          subtitle: `Phone: ${b.contact_no || '-'} | A/C: ${b.primary_acc_no || '-'} | IFSC: ${b.ifsc || '-'}`,
          badge: 'BROKER / FLEET',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          tag: b.primary_acc_no ? 'BANK READY' : 'NO BANK',
          details: `A/C: ${b.primary_acc_no || '-'} | IFSC: ${b.ifsc || '-'}`
        });
      }
    });

    return results;
  }, [query, salesOrders, trips, moneyFreights, parties, brokers]);

  // Filtered by selected category chip
  const filteredResults = useMemo(() => {
    if (activeCategory === 'ALL') return allResults;
    if (activeCategory === 'ORDERS') return allResults.filter(r => r.type === 'order');
    if (activeCategory === 'FLEET') return allResults.filter(r => r.type === 'trip');
    if (activeCategory === 'MF') return allResults.filter(r => r.type === 'mf');
    if (activeCategory === 'PARTIES') return allResults.filter(r => r.type === 'party');
    if (activeCategory === 'BROKERS') return allResults.filter(r => r.type === 'broker');
    return allResults;
  }, [allResults, activeCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: allResults.length,
      ORDERS: allResults.filter(r => r.type === 'order').length,
      FLEET: allResults.filter(r => r.type === 'trip').length,
      MF: allResults.filter(r => r.type === 'mf').length,
      PARTIES: allResults.filter(r => r.type === 'party').length,
      BROKERS: allResults.filter(r => r.type === 'broker').length
    };
  }, [allResults]);

  // Keyboard navigation inside results
  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        handleSelectItem(selected);
      }
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    onNavigate(item.tab);
    setIsOpen(false);
  };

  const getResultIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'order':
        return <FileSpreadsheet className="h-4 w-4 text-blue-400" />;
      case 'trip':
        return <Truck className="h-4 w-4 text-emerald-400" />;
      case 'mf':
        return <Receipt className="h-4 w-4 text-amber-400" />;
      case 'party':
        return <Building2 className="h-4 w-4 text-purple-400" />;
      case 'broker':
        return <Users className="h-4 w-4 text-cyan-400" />;
    }
  };

  // Quick Jumps when query is empty
  const quickJumps: { label: string; tab: ActiveTab; icon: React.ReactNode; desc: string }[] = [
    { label: 'Master Report (All Columns)', tab: 'master-report', icon: <FileText className="h-4 w-4 text-cyan-400" />, desc: 'Consolidated operations & financial register' },
    { label: 'Sales Orders', tab: 'sales-orders', icon: <FileSpreadsheet className="h-4 w-4 text-blue-400" />, desc: 'Register new orders & rate margins' },
    { label: 'Fleet & Vehicle Allocation', tab: 'trip-allocation', icon: <Truck className="h-4 w-4 text-emerald-400" />, desc: 'Assign lorries & drivers' },
    { label: 'Money Freight (MF)', tab: 'money-freight', icon: <Receipt className="h-4 w-4 text-amber-400" />, desc: 'Diesel advances & freight ledger' },
    { label: 'Profit & Margins', tab: 'profit', icon: <TrendingUp className="h-4 w-4 text-emerald-400" />, desc: 'Gross margin & P&L statements' },
    { label: 'Settlements & Banking', tab: 'account', icon: <CreditCard className="h-4 w-4 text-purple-400" />, desc: 'NEFT/RTGS bank payouts' }
  ];

  return (
    <>
      {/* Search Input Trigger in Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/10 bg-black/25 hover:bg-white/5 hover:border-white/20 text-slate-400 text-xs transition-all max-w-[260px] md:max-w-[340px] w-full"
        title="Quick search across all SOs, Lorries, Drivers, Money Freights, Parties and Brokers (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate text-left flex-1 text-slate-300">
          Search SO#, Lorry#, Party, Driver...
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-slate-300 border border-white/10 shadow-xs">
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </kbd>
      </button>

      {/* Global Search Command Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          {/* Backdrop click to dismiss */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div
            className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${themeStyles.cardBg} ${themeStyles.cardBorder} z-10`}
            onKeyDown={handleKeyDownInList}
          >
            {/* Top Search Input Bar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search className="h-5 w-5 text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type to search lorry number, SO#, driver, party, broker, MF#..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={() => setIsOpen(false)}
                className="cursor-pointer px-2 py-0.5 text-[11px] font-mono rounded bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10"
              >
                ESC
              </kbd>
            </div>

            {/* Category Filter Chips (When Query Exists) */}
            {query.trim().length > 0 && (
              <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'ALL', label: 'All Results', count: categoryCounts.ALL },
                  { id: 'FLEET', label: 'Lorries & Trips', count: categoryCounts.FLEET },
                  { id: 'ORDERS', label: 'Sales Orders', count: categoryCounts.ORDERS },
                  { id: 'MF', label: 'Money Freight', count: categoryCounts.MF },
                  { id: 'PARTIES', label: 'Parties', count: categoryCounts.PARTIES },
                  { id: 'BROKERS', label: 'Brokers', count: categoryCounts.BROKERS }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id as SearchCategory);
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeCategory === cat.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="font-mono text-[10px] opacity-75">({cat.count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Results Container */}
            <div
              ref={resultsContainerRef}
              className="flex-1 overflow-y-auto p-2 scrollbar-thin divide-y divide-white/5"
            >
              {query.trim().length === 0 ? (
                /* Empty state: Quick Jump modules */
                <div className="p-4 space-y-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
                    Quick Navigation & Registers
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickJumps.map(qj => (
                      <button
                        key={qj.tab}
                        onClick={() => {
                          onNavigate(qj.tab);
                          setIsOpen(false);
                        }}
                        className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-black/20 hover:border-blue-500/40 hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                          {qj.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                            {qj.label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {qj.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
                    <Search className="h-4 w-4 shrink-0 text-blue-400" />
                    <span>
                      Type any keyword above: vehicle numbers (e.g. <em>NL-01</em>), SO numbers, driver phones, party names, or diesel cards.
                    </span>
                  </div>
                </div>
              ) : filteredResults.length === 0 ? (
                /* No Results Found */
                <div className="p-12 text-center text-slate-400">
                  <Search className="h-8 w-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No matching records found for "{query}"
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching by lorry registration, SO reference, party name, or phone number.
                  </p>
                </div>
              ) : (
                /* Matching Results */
                filteredResults.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-600/15 border border-blue-500/30'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0 mt-0.5">
                          {getResultIcon(item.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-100 font-mono">
                              {item.title}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                            {item.tag && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                                {item.tag}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-300 mt-0.5 truncate">
                            {item.subtitle}
                          </div>

                          {item.details && (
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              {item.details}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right zone: Amount or Jump Arrow */}
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        {item.amount && (
                          <span className="text-xs font-mono font-bold text-emerald-400 hidden sm:inline">
                            {item.amount}
                          </span>
                        )}
                        <span
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="p-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 border border-white/10">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 border border-white/10">↓</kbd>
                  <span>to navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 border border-white/10">↵</kbd>
                  <span>to select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 border border-white/10">ESC</kbd>
                  <span>to close</span>
                </span>
              </div>

              <span className="font-mono text-slate-400">
                {filteredResults.length} records found
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;
