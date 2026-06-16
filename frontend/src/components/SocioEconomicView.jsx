import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Info, Activity } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

function SocioEconomicView({ token, user }) {
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock scatter data points representing districts (X = poverty rate, Y = crime rate, z = pop size)
  const scatterData = [
    { x: 8.5, y: 32.4, name: 'Bengaluru Urban', pop: 96 },
    { x: 14.2, y: 29.6, name: 'Mysuru', pop: 30 },
    { x: 10.1, y: 35.8, name: 'Dakshina Kannada', pop: 20 },
    { x: 18.3, y: 22.5, name: 'Kalaburagi', pop: 25 },
    { x: 22.4, y: 12.9, name: 'Belagavi', pop: 47 },
    { x: 12.8, y: 19.8, name: 'Dharwad', pop: 18 },
    { x: 16.5, y: 16.2, name: 'Tumakuru', pop: 26 },
    { x: 25.1, y: 10.5, name: 'Yadgir', pop: 11 },
    { x: 28.3, y: 8.2, name: 'Raichur', pop: 19 }
  ];

  useEffect(() => {
    const fetchCorrelation = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/analytics/correlation');
        const data = await res.json();
        if (Object.keys(data).length > 0) {
          setCorrelation(data);
        } else {
          // Mock correlation matrix
          setCorrelation({
            poverty_rate: { poverty_rate: 1.0, unemployment_rate: 0.74, police_per_capita: -0.42, crime_rate: 0.65 },
            unemployment_rate: { poverty_rate: 0.74, unemployment_rate: 1.0, police_per_capita: -0.31, crime_rate: 0.78 },
            police_per_capita: { poverty_rate: -0.42, unemployment_rate: -0.31, police_per_capita: 1.0, crime_rate: -0.54 },
            crime_rate: { poverty_rate: 0.65, unemployment_rate: 0.78, police_per_capita: -0.54, crime_rate: 1.0 }
          });
        }
      } catch (err) {
        console.error('Failed to load correlation data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrelation();
  }, [token]);

  // Labels for rendering the correlation matrix grid
  const variables = [
    { key: 'poverty_rate', label: 'Poverty Rate' },
    { key: 'unemployment_rate', label: 'Unemployment' },
    { key: 'police_per_capita', label: 'Police / Capita' },
    { key: 'crime_rate', label: 'Crime Rate' }
  ];

  // Helper for heatmap cell color based on correlation coefficient value
  const getCellBg = (val) => {
    if (val === 1.0) return 'bg-indigo-600 text-white font-bold';
    if (val > 0.6) return 'bg-indigo-100 text-indigo-800 font-semibold';
    if (val > 0.3) return 'bg-indigo-50 text-indigo-700';
    if (val < -0.4) return 'bg-rose-100 text-rose-800 font-semibold';
    if (val < 0) return 'bg-rose-50 text-rose-700';
    return 'bg-slate-50 text-slate-500';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview insights */}
      <div className="glass-panel p-6 rounded-2xl flex items-start space-x-4">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Crime and Society Relationship</h4>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            This page shows the connection between crime levels and social factors (like poverty, unemployment, and police presence). By understanding these links, police and government headers can direct resources to the root causes of crime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Heatmap Grid */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">Relationship Grid (Higher numbers mean stronger connections)</h4>
          
          <div className="flex-1 flex flex-col justify-center">
            {/* Headers row */}
            <div className="grid grid-cols-5 gap-2 mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div></div>
              {variables.map(v => <div key={v.key} className="truncate">{v.label}</div>)}
            </div>

            {/* Matrix rows */}
            {correlation && variables.map(rowVar => (
              <div key={rowVar.key} className="grid grid-cols-5 gap-2 mb-2 text-center text-xs">
                {/* Row Header */}
                <div className="text-left font-bold text-slate-500 flex items-center pr-2 uppercase text-[10px] tracking-wider truncate">
                  {rowVar.label}
                </div>
                
                {/* Row Cells */}
                {variables.map(colVar => {
                  const val = correlation[rowVar.key]?.[colVar.key] ?? 0;
                  return (
                    <div 
                      key={colVar.key}
                      className={`py-3.5 rounded-xl border border-slate-100 flex items-center justify-center font-mono ${getCellBg(val)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-start space-x-2 mt-4 text-[10px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span><strong>Help:</strong> A score of 1.00 means both numbers change together perfectly. A positive score (above 0) means crime increases with that factor (like unemployment). A negative score (below 0) means crime decreases as that factor increases (like having more police).</span>
          </div>
        </div>

        {/* Scatter Bubble Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Unemployment vs. Crime Rate</h4>
            <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">Relationship strength = 0.78</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="Unemployment Rate" unit="%" stroke="#64748b" fontSize={11}>
                  <Label value="Unemployment Rate (%)" offset={-10} position="insideBottom" fill="#64748b" fontSize={11} />
                </XAxis>
                <YAxis type="number" dataKey="y" name="Crime Rate" unit=" per 100k" stroke="#64748b" fontSize={11}>
                  <Label value="Crime Rate (per 100K)" angle={-90} position="insideLeft" offset={0} fill="#64748b" fontSize={11} />
                </YAxis>
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#334155' }}
                />
                <Scatter name="Districts" data={scatterData} fill="#4F46E5" line={false} shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocioEconomicView;
