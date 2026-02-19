"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; weight: number; chest: number; waist: number; biceps: number };

export function ProgressCharts({ data }: { data: Point[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="surface h-56 overflow-hidden p-2 sm:h-64 sm:p-3">
        <p className="mb-2 text-sm font-medium">Weight Trend</p>
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
      <div className="surface h-56 overflow-hidden p-2 sm:h-64 sm:p-3">
        <p className="mb-2 text-sm font-medium">Measurements</p>
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
