"use client";

// Chart kit (recharts) — Ledger palette, INR-aware tooltips, reduced decoration.

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactINR } from "@/lib/format";

const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
];

const money = (v: number) => compactINR(v);
const axisStyle = { fontSize: 11, fill: "var(--color-ink-faint)" };

export function NetWorthChart({
  data,
  height = 220,
}: {
  data: { date: string; netWorth: number; assets: number; liabilities: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisStyle}
          tickFormatter={(d: string) => d.slice(2, 7)}
          minTickGap={48}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={axisStyle} tickFormatter={money} width={56} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip formatter={(v) => money(Number(v))} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="var(--color-brand)" strokeWidth={2} fill="url(#nw)" />
        <Line type="monotone" dataKey="assets" stroke="var(--color-gain)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AllocationDonut({
  data,
  height = 200,
}: {
  data: { class: string; value: number; pct: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="class" innerRadius="58%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, name, p) => [`${money(Number(v))} (${(p?.payload?.pct ?? 0).toFixed(1)}%)`, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CashflowBars({
  data,
  height = 200,
}: {
  data: { month: string; income: number; expenses: number; invested: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickFormatter={(m: string) => m.slice(5)} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} tickFormatter={money} width={52} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="var(--color-chart-5)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="invested" name="Invested" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FanChart({
  data,
  target,
  height = 240,
  startYear,
}: {
  data: { month: number; p10: number; p25: number; p50: number; p75: number; p90: number }[];
  target?: number;
  height?: number;
  startYear?: number;
}) {
  const y0 = startYear ?? new Date().getFullYear();
  const rows = data.map((d) => ({
    ...d,
    year: y0 + d.month / 12,
    band80: [d.p10, d.p90] as [number, number],
    band50: [d.p25, d.p75] as [number, number],
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickFormatter={(y: number) => `${Math.round(y)}`} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={axisStyle} tickFormatter={money} width={60} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => {
            if (Array.isArray(v)) return [`${money(v[0])} – ${money(v[1])}`, name];
            return [money(Number(v)), name];
          }}
          labelFormatter={(y) => `${Math.round(Number(y))}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area dataKey="band80" name="10–90th pct" stroke="none" fill="var(--color-chart-1)" fillOpacity={0.12} />
        <Area dataKey="band50" name="25–75th pct" stroke="none" fill="var(--color-chart-1)" fillOpacity={0.22} />
        <Line dataKey="p50" name="Median" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
        {target !== undefined && (
          <Line
            dataKey={() => target}
            name="Target"
            stroke="var(--color-loss)"
            strokeDasharray="6 4"
            dot={false}
            strokeWidth={1.5}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AmortizationChart({
  data,
  height = 180,
}: {
  data: { period: number; principal: number; interest: number; balance: number }[];
  height?: number;
}) {
  // downsample to yearly points
  const yearly = data.filter((r) => r.period % 12 === 0 || r.period === data.length);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={yearly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="period" tick={axisStyle} tickFormatter={(p: number) => `${Math.round(p / 12)}y`} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} tickFormatter={money} width={56} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(p) => `Month ${p}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Area dataKey="balance" name="Outstanding" stroke="var(--color-chart-7)" fill="var(--color-chart-7)" fillOpacity={0.15} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ScoreHistoryChart({
  data,
  height = 120,
}: {
  data: { date: string; total: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={axisStyle} tickFormatter={(d: string) => d.slice(2, 7)} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis domain={[0, 100]} tick={axisStyle} width={28} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line dataKey="total" name="Score" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({
  data,
  height = 220,
}: {
  data: { category: string; amount: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={axisStyle} tickFormatter={money} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="category" tick={{ ...axisStyle, fontSize: 12 }} width={104} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
