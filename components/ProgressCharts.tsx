"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; weight: number; chest: number; waist: number; biceps: number };

export function ProgressCharts({ data }: { data: Point[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="h-56 overflow-hidden rounded-xl border border-emerald-100 bg-white p-2.5 sm:h-64 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-800">Weight Trend</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">kg</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 6 }}>
            <XAxis dataKey="date" hide />
            <YAxis width={24} tick={{ fontSize: 11 }} />
            <Tooltip
              wrapperStyle={{ maxWidth: "72vw" }}
              contentStyle={{ fontSize: "12px", borderRadius: "10px", borderColor: "#d1d5db" }}
            />
            <Line type="monotone" dataKey="weight" stroke="#2f855a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-56 overflow-hidden rounded-xl border border-emerald-100 bg-white p-2.5 sm:h-64 sm:p-3">
        <p className="mb-2 text-sm font-medium text-zinc-800">Measurements</p>
        <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Chest</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Waist</span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-medium text-zinc-700">Biceps</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 6 }}>
            <XAxis dataKey="date" hide />
            <YAxis width={24} tick={{ fontSize: 11 }} />
            <Tooltip
              wrapperStyle={{ maxWidth: "72vw" }}
              contentStyle={{ fontSize: "12px", borderRadius: "10px", borderColor: "#d1d5db" }}
            />
            <Line type="monotone" dataKey="chest" stroke="#2f855a" dot={false} />
            <Line type="monotone" dataKey="waist" stroke="#c05621" dot={false} />
            <Line type="monotone" dataKey="biceps" stroke="#1f2937" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
