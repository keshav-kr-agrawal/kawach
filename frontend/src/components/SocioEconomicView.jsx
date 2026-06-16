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
    if (val === 1.0) return 'bg-lavender text-obsidian-900 font-bold';
    if (val > 0.6) return 'bg-lavender/30 text-white font-semibold';
    if (val > 0.3) return 'bg-lavender/15 text-gray-300';
    if (val < -0.4) return 'bg-crimson/20 text-crimson font-semibold';
    if (val < 0) return 'bg-crimson/10 text-gray-400';
    return 'bg-obsidian-800 text-gray-400';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview insights */}
      <div className="glass-panel p-6 rounded-2xl flex items-start space-x-4">
        <div className="p-3 bg-lavender/10 rounded-xl text-lavender shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Multi-Variate Crime Correlation</h4>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            This module correlates district crime indexes with socio-economic parameters (poverty, unemployment, and police density). The correlation matrix identifies strong statistical linkages (Pearson's r), enabling the Home Department to direct resources to root cause developmental zones.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Heatmap Grid */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Pearson Correlation Matrix Heatmap</h4>
          
          <div className="flex-1 flex flex-col justify-center">
            {/* Headers row */}
            <div className="grid grid-cols-5 gap-2 mb-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div></div>
              {variables.map(v => <div key={v.key} className="truncate">{v.label}</div>)}
            </div>

            {/* Matrix rows */}
            {correlation && variables.map(rowVar => (
              <div key={rowVar.key} className="grid grid-cols-5 gap-2 mb-2 text-center text-xs">
                {/* Row Header */}
                <div className="text-left font-semibold text-gray-400 flex items-center pr-2 uppercase text-[10px] tracking-wider truncate">
                  {rowVar.label}
                </div>
                
                {/* Row Cells */}
                {variables.map(colVar => {
                  const val = correlation[rowVar.key]?.[colVar.key] ?? 0;
                  return (
                    <div 
                      key={colVar.key}
                      className={`py-3.5 rounded-xl border border-obsidian-700/40 flex items-center justify-center font-mono ${getCellBg(val)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 mt-4 text-[10px] text-gray-400">
            <Info className="w-3.5 h-3.5 text-lavender" />
            <span>Scale: 1.00 = perfect positive correlation; -1.00 = perfect negative correlation.</span>
          </div>
        </div>

        {/* Scatter Bubble Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Unemployment vs. Crime Rate</h4>
            <span className="text-xs px-2.5 py-1 bg-obsidian-700 rounded-lg text-gray-400 font-medium">Pearson's r = 0.78</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" />
                <XAxis type="number" dataKey="x" name="Poverty Rate" unit="%" stroke="#9ca3af" fontSize={11}>
                  <Label value="Poverty Rate (%)" offset={-10} position="insideBottom" fill="#9ca3af" fontSize={11} />
                </XAxis>
                <YAxis type="number" dataKey="y" name="Crime Rate" unit=" per 100k" stroke="#9ca3af" fontSize={11}>
                  <Label value="Crime Rate (per 100K)" angle={-90} position="insideLeft" offset={0} fill="#9ca3af" fontSize={11} />
                </YAxis>
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#2A2A35', borderRadius: '12px' }}
                />
                <Scatter name="Districts" data={scatterData} fill="#9D8DF1" line={false} shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocioEconomicView;
