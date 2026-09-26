import React, { useState } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Palette,
  RotateCcw,
  Download,
  Shield,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Upload,
  FileSpreadsheet,
  LogOut,
  KeyRound
} from 'lucide-react';
import { ThemeMode, User } from '../types';
import { ThemeStyles } from '../utils/theme';
import { ActiveTab } from './Sidebar';
import { useTMSStore } from '../store/useTMSStore';
import { GlobalSearch } from './common/GlobalSearch';

interface HeaderProps {
  activeTab: ActiveTab;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  onLogout?: () => void;
  themeStyles: ThemeStyles;
  onOpenMobileMenu: () => void;
  onResetData: () => void;
  onOpenImport: () => void;
  store: ReturnType<typeof useTMSStore>;
  onNavigate: (tab: ActiveTab) => void;
}

const tabTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Executive Transport Overview', subtitle: 'Live fleet KPI monitoring & pipeline metrics' },
  'master-report': { title: 'Master Report — All-in-One Register', subtitle: 'Consolidated operational manifest, weighbridge tonnage, LM/PM records, settlements & P&L' },
  'sales-orders': { title: 'Sales Orders Management', subtitle: 'Rate margin calculation & conversion register' },
  'trip-allocation': { title: 'Vehicle & Driver Allocation', subtitle: 'Lorry assignment, consignor/consignee routing' },
  dispatch: { title: 'Dispatch & Documentation', subtitle: 'GC generation, E-Way bills & cargo verification' },
  'money-freight': { title: 'Money Freight (MF) Ledger', subtitle: 'Diesel, advances, loading charges & balance math' },
  unloading: { title: 'Unloading & Weighment Registry', subtitle: 'Shortage analysis & delivery acknowledgment' },
  profit: { title: 'Profit & Margin Analysis', subtitle: 'Net margin, GP on sales % and freight revenue audit' },
  account: { title: 'Payment Settlements & Ledger', subtitle: 'Advance & balance bank payouts, settlement audit' },
  reports: { title: 'Transport Reports & Compliance Hub', subtitle: 'Operations manifests, LM/PM audit & P&L balance sheets' },
  parties: { title: 'Party Master Registry', subtitle: 'Consignor/consignee corporate database & GST' },
  places: { title: 'Places & Route Terminals', subtitle: 'Loading points, unloading hubs & state codes' },
  brokers: { title: 'Brokers & Transporters Directory', subtitle: 'Primary & secondary bank accounts for NEFT/RTGS' },
  cards: { title: 'Fuel & Fleet Cards Registry', subtitle: 'BPCL, HPCL & IOCL cards for diesel advances' },
  users: { title: 'User Roles & System Permissions', subtitle: 'Role-based access matrix & operator status' }
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  theme,
  setTheme,
  currentUser,
  users,
  setCurrentUser,
  onLogout,
  themeStyles,
  onOpenMobileMenu,
  onResetData,
  onOpenImport,
  store,
  onNavigate
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const currentTabInfo = tabTitles[activeTab];

  const themeOptions: { id: ThemeMode; label: string; desc: string; icon: string }[] = [
    { id: 'navy', label: 'Maritime Navy', desc: 'Enterprise Logistics', icon: '🌊' },
    { id: 'dark', label: 'Dark Slate', desc: 'Console & Telemetry', icon: '🌙' },
    { id: 'light', label: 'Clean Corporate', desc: 'High Contrast White', icon: '☀️' },
    { id: 'emerald', label: 'Emerald Fleet', desc: 'Supply Chain Pro', icon: '🌲' }
  ];

  return (
    <header className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b px-4 lg:px-8 transition-colors ${themeStyles.headerBg} ${themeStyles.headerBorder}`}>
      {/* Left zone: Mobile toggle + Breadcrumb Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>TMS</span>
            <span aria-hidden="true">/</span>
            <span className="capitalize">{activeTab.replace('-', ' ')}</span>
          </div>
          <h1 className={`text-base font-bold tracking-tight ${themeStyles.textPrimary} whitespace-nowrap`}>
            {currentTabInfo.title}
          </h1>
        </div>
      </div>

      {/* Middle zone: Global Search Engine */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <GlobalSearch store={store} themeStyles={themeStyles} onNavigate={onNavigate} />
      </div>

      {/* Right zone: Theme selector + User Switcher + Reset demo button */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Mobile Search Button */}
        <div className="sm:hidden">
          <GlobalSearch store={store} themeStyles={themeStyles} onNavigate={onNavigate} />
        </div>
        {/* Import Excel Shortcut */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all shadow-xs"
          title="Import Data from Excel or CSV spreadsheets"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import Excel</span>
        </button>

        {/* Theme Picker */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeDropdown(!showThemeDropdown);
              setShowRoleDropdown(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${themeStyles.cardBg} ${themeStyles.cardBorder} ${themeStyles.textSecondary} hover:border-blue-500/50`}
            title="Change Interface Theme"
          >
            <Palette className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline capitalize">{theme} Theme</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showThemeDropdown && (
            <div className={`absolute right-0 mt-2 w-52 rounded-xl border p-1.5 shadow-xl z-50 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Theme
              </div>
              {themeOptions.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    theme === t.id ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10px] opacity-70">{t.desc}</div>
                    </div>
                  </div>
                  {theme === t.id && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Role / Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowThemeDropdown(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${themeStyles.cardBg} ${themeStyles.cardBorder} hover:border-blue-500/50`}
            title={`Active session: ${currentUser.display_name} (${currentUser.role})`}
          >
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                currentUser.role === 'SUPERADMIN' ? 'bg-amber-600 shadow-xs shadow-amber-500/30' : 'bg-blue-600'
              }`}
            >
              {currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className={`text-xs font-semibold leading-tight ${themeStyles.textPrimary} flex items-center gap-1.5`}>
                <span>{currentUser.display_name}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold leading-tight ${
                    currentUser.role === 'SUPERADMIN'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {currentUser.role}
                </span>
                {currentUser.role === 'ADMIN' && (
                  <span className="text-[9px] text-slate-400 hidden xl:inline">(No Edit/Del)</span>
                )}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 opacity-60 text-slate-400" />
          </button>

          {showRoleDropdown && (
            <div className={`absolute right-0 mt-2 w-64 rounded-xl border p-1.5 shadow-xl z-50 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Profile</span>
                <span className="text-[10px] text-blue-400 font-mono">@{currentUser.username}</span>
              </div>

              <div className="p-2 mb-1.5 rounded-lg bg-black/20 border border-white/5 text-[11px] space-y-1">
                <div className="text-slate-300 font-medium">{currentUser.display_name}</div>
                <div className="text-[10px] text-slate-400">
                  Role: <span className="font-semibold text-amber-300">{currentUser.role}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentUser.role === 'SUPERADMIN'
                    ? '✓ Full Power • Edit/Delete • User Management'
                    : '✓ Full Operations • Edit & Delete Restricted'}
                </div>
              </div>

              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch User
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setShowRoleDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    currentUser.id === u.id ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      <span>{u.display_name}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        u.role === 'SUPERADMIN' ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-400/20 text-blue-300'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] opacity-70">
                      @{u.username}
                    </div>
                  </div>
                  {currentUser.id === u.id && <span className="text-xs">✓</span>}
                </button>
              ))}

              {onLogout && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10">
                  <button
                    onClick={() => {
                      setShowRoleDropdown(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out / Lock Session</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Sign Out of SFMPL System"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Reset Clean Data Button */}
        <button
          onClick={() => {
            if (window.confirm('Reset TMS database to clean state with default accounts (SFMPL / admin)? All created records will be cleared.')) {
              onResetData();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all text-slate-400 hover:text-slate-200 border-white/10 hover:bg-white/5`}
          title="Reset to clean production state"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Reset DB</span>
        </button>
      </div>
    </header>
  );
};
