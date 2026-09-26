import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Truck,
  FileCheck,
  Receipt,
  ArrowDownToLine,
  TrendingUp,
  CreditCard,
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Fuel,
  ChevronRight,
  Database,
  BarChart3,
  TableProperties
} from 'lucide-react';
import { ThemeStyles } from '../utils/theme';

export type ActiveTab =
  | 'dashboard'
  | 'master-report'
  | 'sales-orders'
  | 'trip-allocation'
  | 'dispatch'
  | 'money-freight'
  | 'unloading'
  | 'profit'
  | 'account'
  | 'reports'
  | 'parties'
  | 'places'
  | 'brokers'
  | 'cards'
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  themeStyles: ThemeStyles;
  counts: {
    pendingOrders: number;
    pendingTrips: number;
    pendingMF: number;
    pendingAccounts: number;
  };
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  themeStyles,
  counts,
  isOpen,
  setIsOpen
}) => {
  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { id: 'dashboard' as ActiveTab, label: 'Executive Dashboard', icon: LayoutDashboard },
        {
          id: 'master-report' as ActiveTab,
          label: 'Master Report (All-in-One)',
          icon: TableProperties,
          badge: 'Consolidated'
        }
      ]
    },
    {
      label: 'OPERATIONS WORKFLOW',
      items: [
        {
          id: 'sales-orders' as ActiveTab,
          label: 'Sales Orders (SO)',
          icon: FileSpreadsheet,
          badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} new` : undefined
        },
        {
          id: 'trip-allocation' as ActiveTab,
          label: 'Vehicle Allocation',
          icon: Truck,
          badge: counts.pendingTrips > 0 ? `${counts.pendingTrips} open` : undefined
        },
        { id: 'dispatch' as ActiveTab, label: 'Documentation & GC', icon: FileCheck },
        {
          id: 'money-freight' as ActiveTab,
          label: 'Money Freight (MF)',
          icon: Receipt,
          badge: counts.pendingMF > 0 ? `${counts.pendingMF} due` : undefined
        },
        { id: 'unloading' as ActiveTab, label: 'Unloading Master', icon: ArrowDownToLine }
      ]
    },
    {
      label: 'FINANCE & ACCOUNTS',
      items: [
        { id: 'profit' as ActiveTab, label: 'Profit & Margins', icon: TrendingUp },
        {
          id: 'account' as ActiveTab,
          label: 'Payment Settlements',
          icon: CreditCard,
          badge: counts.pendingAccounts > 0 ? `${counts.pendingAccounts} pending` : undefined
        },
        { id: 'reports' as ActiveTab, label: 'Reports & Analytics Hub', icon: BarChart3 }
      ]
    },
    {
      label: 'SYSTEM MASTERS',
      items: [
        { id: 'parties' as ActiveTab, label: 'Party Master', icon: Building2 },
        { id: 'places' as ActiveTab, label: 'Place Master', icon: MapPin },
        { id: 'brokers' as ActiveTab, label: 'Brokers & Bank A/C', icon: Users },
        { id: 'cards' as ActiveTab, label: 'Fuel & Fleet Cards', icon: Fuel },
        { id: 'users' as ActiveTab, label: 'User Roles & Access', icon: ShieldCheck }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-68 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0 ${themeStyles.sidebarBg} ${themeStyles.sidebarBorder} ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className={`flex h-16 items-center justify-between px-5 border-b ${themeStyles.sidebarBorder}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-xs">
              <span className="font-mono text-sm tracking-wider">SF</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm text-slate-100">
                <span>SFMPL TMS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">v4.2</span>
              </div>
              <p className="text-[11px] text-slate-400">Transport & Fleet Management</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map(group => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? themeStyles.sidebarActive
                          : `${themeStyles.sidebarText} ${themeStyles.sidebarHover}`
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className={`p-4 border-t ${themeStyles.sidebarBorder} bg-black/10`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
            <span className="font-mono text-[10px]">Realtime DB</span>
          </div>
        </div>
      </aside>
    </>
  );
};
