import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Zap, RefreshCw } from 'lucide-react';

function AlertsView({ token, user }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Automated Anomaly & Spike Alerts</h3>
          <p className="text-xs text-gray-400 mt-1">
            Real-time Z-score deviation monitoring of weekly crime statistics against rolling district-level averages.
          </p>
        </div>
        
        <button
          onClick={fetchAlerts}
          className="p-2.5 bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 rounded-xl text-gray-400 hover:text-white transition-all flex items-center space-x-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lavender"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`glass-panel p-5 rounded-2xl border-l-4 flex items-start space-x-4 transition-all duration-200 hover:scale-[1.01] ${
                alert.severity === 'Critical' 
                  ? 'border-l-crimson bg-crimson/5 hover:bg-crimson/10' 
                  : 'border-l-gold bg-gold/5 hover:bg-gold/10'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                alert.severity === 'Critical' ? 'bg-crimson/10 text-crimson' : 'bg-gold/10 text-gold'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{alert.district}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-obsidian-700 rounded text-gray-400 font-medium tracking-wide uppercase">
                      {alert.type}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${
                    alert.severity === 'Critical' ? 'text-crimson' : 'text-gold'
                  }`}>
                    Z-SCORE: {alert.z_score}
                  </span>
                </div>
                
                <p className="text-xs text-gray-300 mt-2 font-medium leading-relaxed">{alert.message}</p>
                
                <div className="flex items-center space-x-4 mt-3 text-[10px] text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Karnataka Command</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertsView;
