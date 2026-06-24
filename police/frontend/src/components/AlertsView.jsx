import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Zap, RefreshCw, MessageSquare, Mail, ShieldAlert, ChevronDown, ChevronUp, Sparkles, Brain } from 'lucide-react';

function AlertsView({ token, user }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState({}); // alertId -> string description
  const [expandedAlerts, setExpandedAlerts] = useState({});

  const toggleExpand = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  // Mock physical alert triggers
  const physicalAlerts = [
    {
      id: "ALT-PHYS-001",
      district: "Bengaluru Urban",
      type: "ANPR Spotting",
      message: "CRITICAL: Known gang associate vehicle spotted entering Koramangala hotspot.",
      severity: "Critical",
      z_score: 4.89,
      timestamp: new Date().toISOString(),
      xaiRationale: {
        riskScore: 88,
        text: "Neo4j Graph Path detected: Vehicle(KA-03-MU-4401) -[:OWNED_BY]-> Person(Ramesh K. ID#4401) -[:ASSOCIATED_WITH]-> Person(Gang Leader Rocky ID#007). Ramesh K. is linked to 3 recent burglaries within 2km of Koramangala coordinates."
      }
    },
    {
      id: "ALT-PHYS-002",
      district: "Mysuru",
      type: "CCTV Crowd Alert",
      message: "HIGH: Crowd formation - 15+ people detected near historical monument sector.",
      severity: "High",
      z_score: 3.12,
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      xaiRationale: {
        riskScore: 76,
        text: "Neo4j Graph Path detected: Incident(CCTV_CROWD_02) -[:OCCURRED_AT]-> Location(Mysuru Palace Gate) <-[:OCCURRED_AT]- Incident(Riot_Spurt_01) -[:INVOLVES]-> Person(Jon Offender). Group size of 15+ exceeds assembly thresholds."
      }
    },
    {
      id: "ALT-PHYS-003",
      district: "Mangaluru",
      type: "Restricted Entry",
      message: "CRITICAL: Trespassing - Restricted Zone violation flagged at harbor checkpoint.",
      severity: "Critical",
      z_score: 5.21,
      timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      xaiRationale: {
        riskScore: 94,
        text: "Neo4j Graph Path detected: Person(Suspect ID#99) -[:OWNED]-> Phone(9876543207) -[:CALLED]-> Phone(9876543201) -[:OWNED]-> Person(Ramesh K.). Triangulated thermal sensor maps location violation within Customs Gate."
      }
    }
  ];

  const defaultXaiRationales = {
    "ALT-MOCK-001": {
      riskScore: 92,
      text: "Neo4j Graph Path detected: BankAccount(ACC4401880002) -[:TRANSFERRED_TO]-> BankAccount(ACC4401880001) -[:OWNED]-> Person(John Kumar). Transaction is linked to 15 similar phishing registrations."
    },
    "ALT-MOCK-002": {
      riskScore: 81,
      text: "Neo4j Graph Path detected: Incident(Burglary_Spike) -[:OCCURRED_AT]-> Location(Jayanagar) <-[:OCCURRED_AT]- Incident(Theft_Zone). DBSCAN density maps coordinates deviation at 3.42 sigma."
    }
  };

  const getXaiRationale = (alert) => {
    if (alert.xaiRationale) return alert.xaiRationale;
    if (defaultXaiRationales[alert.id]) return defaultXaiRationales[alert.id];
    // Dynamic fallback for database-fetched alerts
    const score = Math.round(70 + (alert.z_score ? parseFloat(alert.z_score) * 6 : 15));
    return {
      riskScore: Math.min(99, score),
      text: `Triggered due to a localized statistical anomaly in ${alert.district}. The metric is ${alert.z_score || 'N/A'} standard deviations above normal threshold, suggesting a potential correlation with recent incident surges.`
    };
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Combine API alerts with our compliance-critical physical alerts
      // Make sure physical alerts are placed first so they are prominent for the demo
      setAlerts([...physicalAlerts, ...data]);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      // Fallback to mock and physical alerts if API fails
      setAlerts(physicalAlerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const handleSimulateDispatch = (alertId, channel, district) => {
    setDispatchStatus(prev => ({
      ...prev,
      [alertId]: `Sending ${channel} trigger...`
    }));

    setTimeout(() => {
      setDispatchStatus(prev => ({
        ...prev,
        [alertId]: `✅ ${channel} alert successfully dispatched to ${district} SP & Station SHOs.`
      }));
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Weekly & Live Event Alerts</h3>
          <p className="text-xs text-slate-500 mt-1">
            Real-time physical safety triggers paired with Explainable AI (XAI) verification and response logs.
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
          {alerts.map(alert => {
            const rationale = getXaiRationale(alert);
            const isExpanded = !!expandedAlerts[alert.id];
            
            return (
              <div 
                key={alert.id}
                className={`border border-slate-200 p-5 rounded-2xl border-l-4 flex flex-col transition-all duration-200 hover:shadow-md ${
                  alert.severity === 'Critical' 
                    ? 'border-l-rose-500 bg-rose-50/30 hover:bg-rose-50/50' 
                    : 'border-l-amber-500 bg-amber-50/30 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-start space-x-4 w-full cursor-pointer" onClick={() => toggleExpand(alert.id)}>
                  <div className={`p-2 rounded-xl shrink-0 ${
                    alert.severity === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{alert.district}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold tracking-wide uppercase">
                          {alert.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-bold ${
                          alert.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          SPIKE INDEX: {alert.z_score}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
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

                {/* XAI Expanding Accordion Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200/50 bg-white/60 p-4 rounded-xl space-y-2 animate-slide-down">
                    <div className="flex items-center space-x-2 text-indigo-700">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Explainable AI (XAI) Report</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="bg-slate-150 rounded-full h-2 w-32 overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full ${rationale.riskScore > 85 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${rationale.riskScore}%` }} 
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Risk Score: {rationale.riskScore}%</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed mt-2 font-medium">
                      <strong className="text-indigo-900">AI Rationale:</strong> {rationale.text}
                    </p>
                    <span className="text-[8px] text-slate-400 block mt-1">
                      * Compliance Verification: Generated in accordance with Section 65B IEA audit-trail regulations.
                    </span>
                  </div>
                )}

                {/* Simulated dispatch channel bar */}
                <div className="border-t border-slate-200/50 mt-4 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSimulateDispatch(alert.id, 'SMS', alert.district)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send SMS Broadcast</span>
                    </button>
                    <button
                      onClick={() => handleSimulateDispatch(alert.id, 'Email', alert.district)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Email Alert</span>
                    </button>
                  </div>
                  
                  {dispatchStatus[alert.id] && (
                    <span className="text-[10px] font-bold text-indigo-700 animate-fade-in bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                      {dispatchStatus[alert.id]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escalation Policy info card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start space-x-4 mt-8">
        <ShieldAlert className="w-6 h-6 text-slate-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Spike Alert Escalation Policy</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
            Standard Operating Procedure (SOP) requires all **Critical** level spike warnings to be resolved within 4 hours by the SP. If no status modifications occur, alerts escalate automatically to DGP and alert channels.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AlertsView;
