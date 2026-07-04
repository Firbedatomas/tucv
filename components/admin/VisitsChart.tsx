"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function VisitsChart({
  data,
  primaryColor,
  accentColor,
  borderColor,
}: {
  data: { date: string; visitors: number; pageviews: number }[];
  primaryColor: string;
  accentColor: string;
  borderColor: string;
}) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.25} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={36} />
          <Tooltip />
          <Line type="monotone" dataKey="visitors" name="Visitantes" stroke={primaryColor} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pageviews" name="Pageviews" stroke={accentColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
