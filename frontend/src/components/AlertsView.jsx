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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Weekly Crime Spike Alerts</h3>
          <p className="text-xs text-slate-500 mt-1">
            Alerts are generated when crime rates go up significantly compared to normal levels in each district.
          </p>
        </div>
        
        <button
          onClick={fetchAlerts}
          className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 transition-all flex items-center space-x-2 text-xs font-semibold shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`border border-slate-200 p-5 rounded-2xl border-l-4 flex items-start space-x-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-md ${
                alert.severity === 'Critical' 
                  ? 'border-l-rose-500 bg-rose-50/30 hover:bg-rose-50' 
                  : 'border-l-amber-500 bg-amber-50/30 hover:bg-amber-50'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                alert.severity === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{alert.district}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold tracking-wide uppercase">
                      {alert.type}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${
                    alert.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    SPIKE INDEX: {alert.z_score}
                  </span>
                </div>
                
                <p className="text-xs text-slate-700 mt-2 font-semibold leading-relaxed">{alert.message}</p>
                
                <div className="flex items-center space-x-4 mt-3 text-[10px] text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Karnataka Command Center</span>
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
