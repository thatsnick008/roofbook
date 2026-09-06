"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { compactMoney, money } from "@/lib/format";

const axis = { stroke: "rgb(var(--muted))", fontSize: 11, tickLine: false, axisLine: false } as const;

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item: any) => (
        <p key={item.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}: <span className="font-semibold text-fg">{money(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function CashflowChart({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={(value) => compactMoney(Number(value))} width={54} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "rgb(var(--brand) / 0.06)" }} />
          <Bar dataKey="income" name="Income" fill="rgb(var(--positive))" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="rgb(var(--negative))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EquityTrend({ data }: { data: { month: string; net: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={(value) => compactMoney(Number(value))} width={54} />
          <Tooltip content={<TooltipBox />} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net cashflow"
            stroke="rgb(var(--brand))"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
