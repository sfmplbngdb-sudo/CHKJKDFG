import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
  DollarSign,
  Fuel,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { MoneyFreight, Profit, SalesOrder, TripDispatch } from '../types';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum } from '../utils/formatters';

interface ProjectedProfitChartProps {
  moneyFreights: MoneyFreight[];
  trips: TripDispatch[];
  salesOrders: SalesOrder[];
  profits: Profit[];
  themeStyles: ThemeStyles;
  onNavigateToMF?: () => void;
  onNavigateToProfit?: () => void;
}

interface DayPoint {
  day: number;
  dateStr: string;
  actualProfit: number;
  projectedProfit: number;
  cumulativeActual: number;
  cumulativeProjected: number;
  activeMFCount: number;
  volumeMT: number;
  isFuture: boolean;
  isCurrentDay: boolean;
}

export const ProjectedProfitChart: React.FC<ProjectedProfitChartProps> = ({
  moneyFreights,
  trips,
  salesOrders,
  profits,
  themeStyles,
  onNavigateToMF,
  onNavigateToProfit
}) => {
  const [chartMode, setChartMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [hoveredPoint, setHoveredPoint] = useState<DayPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Month configuration: defaults to current local date
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentDayNum = now.getDate();

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const totalDaysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  // Fast lookup maps
  const profitBySoId = useMemo(() => new Map(profits.map(p => [p.so_id, p])), [profits]);
  const tripBySoId = useMemo(() => new Map(trips.map(t => [t.so_id, t])), [trips]);
  const soById = useMemo(() => new Map(salesOrders.map(s => [s.id, s])), [salesOrders]);

  // Aggregate Money Freight profit data for current month
  const {
    points,
    monthToDateActual,
    projectedMonthEndTotal,
    dailyRunRate,
    activeCurrentMonthCount,
    totalVolumeMT,
    avgProfitPerMT,
    profitMarginPct
  } = useMemo(() => {
    // Collect active MF entries that fall within the current month
    const currentMonthMFs: {
      mf: MoneyFreight;
      day: number;
      profit: number;
      mt: number;
    }[] = [];

    let totalBilledRevenue = 0;
    let totalComputedCost = 0;

    moneyFreights.forEach(mf => {
      // Determine effective date for this Money Freight
      const trip = tripBySoId.get(mf.so_id);
      const so = soById.get(mf.so_id);
      const dateStr = mf.created_at || (trip?.loading_date ? trip.loading_date : (trip?.allocation_date ? trip.allocation_date : (so?.created_at ? so.created_at : '')));

      let mfDate: Date;
      if (dateStr) {
        mfDate = new Date(dateStr);
      } else {
        mfDate = now;
      }

      // Check if it belongs to current year and month
      if (
        !isNaN(mfDate.getTime()) &&
        mfDate.getFullYear() === currentYear &&
        mfDate.getMonth() === currentMonthIdx
      ) {
        const day = mfDate.getDate();
        const profitRec = profitBySoId.get(mf.so_id);

        let profitAmount = 0;
        let revenue = 0;
        let cost = 0;

        if (profitRec && profitRec.gross_profit !== undefined) {
          profitAmount = profitRec.gross_profit;
          revenue = profitRec.total_revenue;
          cost = profitRec.total_cost;
        } else {
          // Compute directly from Money Freight math
          const partyRate = so?.rate_received || mf.pmt_rate || 0;
          const billed = mf.bilti_freight || (mf.final_mt * partyRate);
          const actualCost = mf.total_cost || (mf.freight_mf + (mf.total_exp || 0) + (mf.extra_labour || 0));
          revenue = billed;
          cost = actualCost;
          profitAmount = billed - actualCost;
        }

        totalBilledRevenue += revenue;
        totalComputedCost += cost;

        currentMonthMFs.push({
          mf,
          day: Math.min(Math.max(day, 1), totalDaysInMonth),
          profit: profitAmount,
          mt: mf.final_mt || so?.mt || 0
        });
      }
    });

    // Group profits by day
    const dayActuals = new Array(totalDaysInMonth + 1).fill(0);
    const dayVolumes = new Array(totalDaysInMonth + 1).fill(0);
    const dayCounts = new Array(totalDaysInMonth + 1).fill(0);

    currentMonthMFs.forEach(item => {
      dayActuals[item.day] += item.profit;
      dayVolumes[item.day] += item.mt;
      dayCounts[item.day] += 1;
    });

    // Realized profit so far
    let cumulativeActual = 0;
    const elapsedDays = Math.min(currentDayNum, totalDaysInMonth);
    let daysWithDataCount = 0;

    for (let d = 1; d <= elapsedDays; d++) {
      cumulativeActual += dayActuals[d];
      if (dayActuals[d] !== 0 || dayCounts[d] > 0) {
        daysWithDataCount++;
      }
    }

    // Daily run rate: strictly calculated from actual data. If no MFs exist, run rate is 0!
    const divisor = daysWithDataCount > 0 ? daysWithDataCount : Math.max(elapsedDays, 1);
    const runRate = cumulativeActual > 0 ? cumulativeActual / divisor : 0;
    const projectedRemaining = runRate * Math.max(totalDaysInMonth - elapsedDays, 0);
    const projectedMonthEndTotal = cumulativeActual + projectedRemaining;

    // Build day points
    const pts: DayPoint[] = [];
    let runningActual = 0;
    let runningProjected = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const isFuture = d > elapsedDays;
      const isCurrentDay = d === elapsedDays;
      const dActual = isFuture ? 0 : dayActuals[d];

      if (!isFuture) {
        runningActual += dActual;
        runningProjected = runningActual;
      } else {
        // Daily projected incremental step
        runningProjected += runRate;
      }

      const dateObj = new Date(currentYear, currentMonthIdx, d);
      const dateStr = dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      pts.push({
        day: d,
        dateStr,
        actualProfit: dActual,
        projectedProfit: isFuture ? Math.round(runRate) : dActual,
        cumulativeActual: isFuture ? 0 : Math.round(runningActual),
        cumulativeProjected: Math.round(runningProjected),
        activeMFCount: dayCounts[d],
        volumeMT: Number(dayVolumes[d].toFixed(1)),
        isFuture,
        isCurrentDay
      });
    }

    const totalVolume = currentMonthMFs.reduce((sum, item) => sum + item.mt, 0);
    const avgProfitMT = totalVolume > 0 ? cumulativeActual / totalVolume : 0;
    const margin = totalBilledRevenue > 0 ? (cumulativeActual / totalBilledRevenue) * 100 : 0;

    return {
      points: pts,
      monthToDateActual: Math.round(cumulativeActual),
      projectedMonthEndTotal: Math.round(projectedMonthEndTotal),
      dailyRunRate: Math.round(runRate),
      activeCurrentMonthCount: currentMonthMFs.length,
      totalVolumeMT: Number(totalVolume.toFixed(1)),
      avgProfitPerMT: Math.round(avgProfitMT),
      profitMarginPct: Number(margin.toFixed(1))
    };
  }, [moneyFreights, currentYear, currentMonthIdx, currentDayNum, totalDaysInMonth, profitBySoId, tripBySoId, soById, now]);

  // Chart Dimensions & Coordinate Geometry
  const chartWidth = 840;
  const chartHeight = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 70 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Compute Scales
  const { maxVal, minVal, actualPath, projectedPath, actualAreaPath } = useMemo(() => {
    let max = 0;
    let min = 0;

    if (chartMode === 'cumulative') {
      max = Math.max(...points.map(p => p.cumulativeProjected), ...points.map(p => p.cumulativeActual), 100000);
      min = 0;
    } else {
      max = Math.max(...points.map(p => Math.max(p.actualProfit, p.projectedProfit)), 25000);
      min = Math.min(...points.map(p => p.actualProfit), 0);
    }

    // Add 10% headroom
    max = Math.ceil((max * 1.1) / 10000) * 10000;

    const getX = (day: number) => padding.left + ((day - 1) / (totalDaysInMonth - 1)) * innerWidth;
    const getY = (val: number) => {
      const range = max - min || 1;
      const normalized = (val - min) / range;
      return padding.top + innerHeight - normalized * innerHeight;
    };

    // Build actual path (from Day 1 up to elapsedDays)
    const actualPoints = points.filter(p => !p.isFuture);
    const projectedPoints = points.filter(p => p.day >= currentDayNum);

    // SVG Path generator (smoothing with cubic beziers)
    const buildSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return path;
    };

    const actualCoords = actualPoints.map(p => ({
      x: getX(p.day),
      y: getY(chartMode === 'cumulative' ? p.cumulativeActual : p.actualProfit)
    }));

    const projectedCoords = projectedPoints.map(p => ({
      x: getX(p.day),
      y: getY(chartMode === 'cumulative' ? p.cumulativeProjected : p.projectedProfit)
    }));

    const actPath = buildSmoothPath(actualCoords);
    const projPath = buildSmoothPath(projectedCoords);

    // Actual Area Under Curve
    let actArea = '';
    if (actualCoords.length > 0) {
      const firstX = actualCoords[0].x;
      const lastX = actualCoords[actualCoords.length - 1].x;
      const zeroY = getY(0);
      actArea = `${actPath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
    }

    return {
      maxVal: max,
      minVal: min,
      actualPath: actPath,
      projectedPath: projPath,
      actualAreaPath: actArea,
      getX,
      getY
    };
  }, [points, chartMode, innerWidth, innerHeight, padding, totalDaysInMonth, currentDayNum]);

  // Horizontal Y-Axis Gridlines
  const yTicks = useMemo(() => {
    const ticksCount = 4;
    const ticks: { val: number; y: number; label: string }[] = [];
    const step = (maxVal - minVal) / ticksCount;

    for (let i = 0; i <= ticksCount; i++) {
      const val = minVal + step * i;
      const range = maxVal - minVal || 1;
      const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
      ticks.push({
        val,
        y,
        label: fmtCurrency(val)
      });
    }
    return ticks;
  }, [maxVal, minVal, padding, innerHeight]);

  // X-Axis Day Labels (every 4-5 days)
  const xTicks = useMemo(() => {
    return points.filter(p => p.day === 1 || p.day % 5 === 0 || p.day === totalDaysInMonth);
  }, [points, totalDaysInMonth]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Find nearest point
    const relativeX = (mouseX - padding.left) / innerWidth;
    const targetDay = Math.min(Math.max(Math.round(relativeX * (totalDaysInMonth - 1) + 1), 1), totalDaysInMonth);
    const pt = points.find(p => p.day === targetDay);

    if (pt) {
      setHoveredPoint(pt);
      setTooltipPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setTooltipPos(null);
  };

  const currentDayX = padding.left + ((currentDayNum - 1) / (totalDaysInMonth - 1)) * innerWidth;

  return (
    <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder} shadow-xs`}>
      {/* Top Section Header */}
      <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Projected Freight Profit Trends — {monthName}
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Active Money Freight Model
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realized margins computed from manifested Money Freight dispatches, with run-rate trajectory modeling for month-end closure.
          </p>
        </div>

        {/* View Switches & Quick Links */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Display Mode Switcher */}
          <div className="flex items-center rounded-lg bg-black/30 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                chartMode === 'cumulative'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cumulative Trajectory
            </button>
            <button
              onClick={() => setChartMode('daily')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                chartMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily Breakdown
            </button>
          </div>

          {onNavigateToMF && (
            <button
              onClick={onNavigateToMF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
            >
              <span>MF Ledger</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Projected Financial Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-black/15 border-b border-white/5">
        {/* Metric 1: Month-to-Date Realized */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>MTD Realized Profit</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-emerald-400">
            {fmtCurrency(monthToDateActual)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Day 1 – {currentDayNum} ({activeCurrentMonthCount} Active MFs)
          </div>
        </div>

        {/* Metric 2: Projected Month-End */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected Month-End</span>
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-cyan-300">
            {fmtCurrency(projectedMonthEndTotal)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Based on current dispatch run-rate
          </div>
        </div>

        {/* Metric 3: Daily Run-Rate */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Average Daily Profit</span>
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-100">
            {fmtCurrency(dailyRunRate)} <span className="text-xs font-normal text-slate-400">/ day</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {totalDaysInMonth - currentDayNum} days remaining in month
          </div>
        </div>

        {/* Metric 4: Margin & Volume Benchmark */}
        <div className="p-3.5 rounded-lg border border-white/5 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Yield & Volume</span>
            <Layers className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-100">
            {fmtCurrency(avgProfitPerMT)} <span className="text-xs font-normal text-slate-400">/ MT</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {totalVolumeMT} MT loaded ({profitMarginPct}% GP)
          </div>
        </div>
      </div>

      {/* Interactive SVG Line Chart */}
      <div className="p-5 relative select-none">
        {/* Legend */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium">Realized Profit (Day 1 – {currentDayNum})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 border-b-2 border-dashed border-cyan-400" />
              <span className="text-slate-300 font-medium">Projected Trajectory (Day {currentDayNum} – {totalDaysInMonth})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-slate-400">Current Date Marker</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Hover over nodes for daily consignment detail
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full overflow-hidden">
          {activeCurrentMonthCount === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px] rounded-lg p-6 text-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">No Dispatches Manifested for {monthName}</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Realized profit and run-rate projections will calculate dynamically as you create Sales Orders and generate Money Freight (MF) dispatches.
              </p>
            </div>
          )}
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Emerald Gradient for Realized Area */}
              <linearGradient id="realizedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="90%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Cyan Gradient for Projected Area */}
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>

              {/* Glow filter for highlight point */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Gridlines */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={chartWidth - padding.right}
                  y2={tick.y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Current Day Vertical Benchmark Line */}
            <line
              x1={currentDayX}
              y1={padding.top}
              x2={currentDayX}
              y2={padding.top + innerHeight}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.75"
            />
            <text
              x={currentDayX}
              y={padding.top - 10}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-amber-400"
            >
              TODAY (Day {currentDayNum})
            </text>

            {/* Realized Area Under Curve */}
            {actualAreaPath && (
              <path d={actualAreaPath} fill="url(#realizedGradient)" />
            )}

            {/* Projected Trajectory Line (Dashed Cyan) */}
            {projectedPath && (
              <path
                d={projectedPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
            )}

            {/* Realized Profit Line (Solid Emerald) */}
            {actualPath && (
              <path
                d={actualPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow)"
              />
            )}

            {/* Actual Day Markers */}
            {points
              .filter(p => !p.isFuture)
              .map(p => {
                const x = padding.left + ((p.day - 1) / (totalDaysInMonth - 1)) * innerWidth;
                const val = chartMode === 'cumulative' ? p.cumulativeActual : p.actualProfit;
                const range = maxVal - minVal || 1;
                const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
                const isToday = p.day === currentDayNum;

                return (
                  <circle
                    key={`actual-${p.day}`}
                    cx={x}
                    cy={y}
                    r={isToday ? 5 : p.activeMFCount > 0 ? 3.5 : 2}
                    fill={isToday ? '#f59e0b' : '#10b981'}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="transition-all hover:scale-150"
                  />
                );
              })}

            {/* Projected Day Markers */}
            {points
              .filter(p => p.isFuture)
              .map(p => {
                const x = padding.left + ((p.day - 1) / (totalDaysInMonth - 1)) * innerWidth;
                const val = chartMode === 'cumulative' ? p.cumulativeProjected : p.projectedProfit;
                const range = maxVal - minVal || 1;
                const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;

                return (
                  <circle
                    key={`proj-${p.day}`}
                    cx={x}
                    cy={y}
                    r={p.day === totalDaysInMonth ? 5 : 2.5}
                    fill="#06b6d4"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                );
              })}

            {/* X-Axis Day Numbers & Labels */}
            {xTicks.map(p => {
              const x = padding.left + ((p.day - 1) / (totalDaysInMonth - 1)) * innerWidth;
              return (
                <g key={`x-${p.day}`}>
                  <line
                    x1={x}
                    y1={padding.top + innerHeight}
                    x2={x}
                    y2={padding.top + innerHeight + 5}
                    stroke="rgba(255, 255, 255, 0.2)"
                  />
                  <text
                    x={x}
                    y={padding.top + innerHeight + 18}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-400"
                  >
                    {p.dateStr}
                  </text>
                </g>
              );
            })}

            {/* Active Hover Crosshair */}
            {hoveredPoint && (
              <g>
                {(() => {
                  const x = padding.left + ((hoveredPoint.day - 1) / (totalDaysInMonth - 1)) * innerWidth;
                  const val =
                    chartMode === 'cumulative'
                      ? hoveredPoint.isFuture
                        ? hoveredPoint.cumulativeProjected
                        : hoveredPoint.cumulativeActual
                      : hoveredPoint.isFuture
                      ? hoveredPoint.projectedProfit
                      : hoveredPoint.actualProfit;
                  const range = maxVal - minVal || 1;
                  const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;

                  return (
                    <>
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={padding.top + innerHeight}
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill={hoveredPoint.isFuture ? '#06b6d4' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    </>
                  );
                })()}
              </g>
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && tooltipPos && (
            <div
              style={{
                left: Math.min(Math.max(tooltipPos.x - 100, 10), chartWidth - 210),
                top: Math.max(tooltipPos.y - 120, 10)
              }}
              className="absolute pointer-events-none z-30 p-3 rounded-lg border border-white/15 bg-slate-900/95 backdrop-blur-md shadow-xl text-xs w-52"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                <span className="font-bold text-slate-200">
                  {hoveredPoint.dateStr}, {currentYear}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    hoveredPoint.isFuture
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {hoveredPoint.isFuture ? 'PROJECTED' : 'REALIZED'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cumulative Profit:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {fmtCurrency(
                      hoveredPoint.isFuture
                        ? hoveredPoint.cumulativeProjected
                        : hoveredPoint.cumulativeActual
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Daily Profit:</span>
                  <span
                    className={`font-mono font-semibold ${
                      hoveredPoint.isFuture ? 'text-cyan-400' : 'text-emerald-400'
                    }`}
                  >
                    {fmtCurrency(
                      hoveredPoint.isFuture
                        ? hoveredPoint.projectedProfit
                        : hoveredPoint.actualProfit
                    )}
                  </span>
                </div>

                {!hoveredPoint.isFuture && (
                  <>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Active MFs:</span>
                      <span className="font-mono text-slate-300">
                        {hoveredPoint.activeMFCount} consignments
                      </span>
                    </div>
                    {hoveredPoint.volumeMT > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Dispatched MT:</span>
                        <span className="font-mono text-slate-300">
                          {hoveredPoint.volumeMT} MT
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectedProfitChart;
