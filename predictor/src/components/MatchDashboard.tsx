import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const dummyData = [
  { team: 'France', xG: 12.4, goals: 11 },
  { team: 'Argentina', xG: 11.2, goals: 13 },
  { team: 'Brazil', xG: 10.8, goals: 9 },
  { team: 'England', xG: 10.1, goals: 10 },
  { team: 'Spain', xG: 9.5, goals: 8 },
  { team: 'Germany', xG: 8.9, goals: 9 },
];

export default function MatchDashboard() {
  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="text-[10px] font-mono text-[var(--muted-text)] uppercase tracking-widest mb-1">Top Goalscorer</div>
          <div className="text-2xl font-bold text-fuchsia-500">K. Mbappé</div>
          <div className="text-sm font-semibold text-[var(--text-color)]">5 Goals</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="text-[10px] font-mono text-[var(--muted-text)] uppercase tracking-widest mb-1">Most Clean Sheets</div>
          <div className="text-2xl font-bold text-fuchsia-500">Martinez</div>
          <div className="text-sm font-semibold text-[var(--text-color)]">4 Clean Sheets</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="text-[10px] font-mono text-[var(--muted-text)] uppercase tracking-widest mb-1">Biggest Upset</div>
          <div className="text-lg font-bold text-fuchsia-500">Haiti 2-1 Brazil</div>
          <div className="text-sm font-semibold text-[var(--text-color)]">Group C</div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6">
        <div className="text-sm font-bold font-mono uppercase tracking-widest mb-6 border-b border-[var(--border-color)] pb-3">
          Expected Goals (xG) vs Actual
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dummyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="team" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09091e', borderColor: 'rgba(217,70,239,0.3)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="goals" fill="#d946ef" radius={[4, 4, 0, 0]} name="Actual Goals" maxBarSize={40} />
              <Bar dataKey="xG" fill="#64748b" radius={[4, 4, 0, 0]} name="Expected Goals (xG)" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
