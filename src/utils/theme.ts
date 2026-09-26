import { ThemeMode } from '../types';

export interface ThemeStyles {
  appBg: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarActive: string;
  sidebarHover: string;
  sidebarText: string;
  sidebarMuted: string;
  headerBg: string;
  headerBorder: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  tableHeaderBg: string;
  tableRowHover: string;
  tableBorder: string;
  inputBg: string;
  inputBorder: string;
}

export const themes: Record<ThemeMode, ThemeStyles> = {
  navy: {
    appBg: 'bg-[#0b1320]',
    sidebarBg: 'bg-[#0f1d32]',
    sidebarBorder: 'border-[#1b2f4f]',
    sidebarActive: 'bg-[#1b345b] text-white',
    sidebarHover: 'hover:bg-[#162944] text-slate-200',
    sidebarText: 'text-slate-300',
    sidebarMuted: 'text-slate-400',
    headerBg: 'bg-[#0f1d32]/95 backdrop-blur-md',
    headerBorder: 'border-[#1b2f4f]',
    cardBg: 'bg-[#132238]',
    cardBorder: 'border-[#1e365b]',
    cardHover: 'hover:border-blue-500/40',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    accent: 'bg-blue-600 hover:bg-blue-500',
    accentHover: 'hover:bg-blue-500',
    accentText: 'text-blue-400',
    tableHeaderBg: 'bg-[#0d1829]',
    tableRowHover: 'hover:bg-[#16263e]/60',
    tableBorder: 'border-[#1b2f4f]',
    inputBg: 'bg-[#0b1424] text-slate-100 placeholder-slate-500',
    inputBorder: 'border-[#22395f] focus:border-blue-500'
  },
  dark: {
    appBg: 'bg-[#090d16]',
    sidebarBg: 'bg-[#0f1523]',
    sidebarBorder: 'border-[#1d263b]',
    sidebarActive: 'bg-[#22304d] text-white',
    sidebarHover: 'hover:bg-[#172033] text-slate-200',
    sidebarText: 'text-slate-300',
    sidebarMuted: 'text-slate-500',
    headerBg: 'bg-[#0f1523]/95 backdrop-blur-md',
    headerBorder: 'border-[#1d263b]',
    cardBg: 'bg-[#131c2e]',
    cardBorder: 'border-[#22304d]',
    cardHover: 'hover:border-indigo-500/40',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    accent: 'bg-indigo-600 hover:bg-indigo-500',
    accentHover: 'hover:bg-indigo-500',
    accentText: 'text-indigo-400',
    tableHeaderBg: 'bg-[#0a0f1a]',
    tableRowHover: 'hover:bg-[#1a253c]/60',
    tableBorder: 'border-[#1f2c45]',
    inputBg: 'bg-[#0a0f1a] text-slate-100 placeholder-slate-500',
    inputBorder: 'border-[#23314e] focus:border-indigo-500'
  },
  light: {
    appBg: 'bg-slate-100',
    sidebarBg: 'bg-white',
    sidebarBorder: 'border-slate-200',
    sidebarActive: 'bg-slate-900 text-white',
    sidebarHover: 'hover:bg-slate-100 text-slate-800',
    sidebarText: 'text-slate-600',
    sidebarMuted: 'text-slate-400',
    headerBg: 'bg-white/95 backdrop-blur-md',
    headerBorder: 'border-slate-200',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHover: 'hover:border-slate-400',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    accent: 'bg-slate-900 hover:bg-slate-800',
    accentHover: 'hover:bg-slate-800',
    accentText: 'text-slate-900',
    tableHeaderBg: 'bg-slate-50',
    tableRowHover: 'hover:bg-slate-50/80',
    tableBorder: 'border-slate-200',
    inputBg: 'bg-white text-slate-900 placeholder-slate-400',
    inputBorder: 'border-slate-300 focus:border-slate-900'
  },
  emerald: {
    appBg: 'bg-[#061412]',
    sidebarBg: 'bg-[#0a1f1c]',
    sidebarBorder: 'border-[#123832]',
    sidebarActive: 'bg-[#15463e] text-white',
    sidebarHover: 'hover:bg-[#0f2e29] text-emerald-100',
    sidebarText: 'text-emerald-200/80',
    sidebarMuted: 'text-emerald-400/60',
    headerBg: 'bg-[#0a1f1c]/95 backdrop-blur-md',
    headerBorder: 'border-[#123832]',
    cardBg: 'bg-[#0d2723]',
    cardBorder: 'border-[#17443c]',
    cardHover: 'hover:border-emerald-500/40',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-100/80',
    textMuted: 'text-emerald-300/60',
    accent: 'bg-emerald-600 hover:bg-emerald-500',
    accentHover: 'hover:bg-emerald-500',
    accentText: 'text-emerald-400',
    tableHeaderBg: 'bg-[#071714]',
    tableRowHover: 'hover:bg-[#123530]/60',
    tableBorder: 'border-[#143e37]',
    inputBg: 'bg-[#071714] text-emerald-100 placeholder-emerald-600/60',
    inputBorder: 'border-[#194c43] focus:border-emerald-500'
  }
};
