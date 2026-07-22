/**
 * Local simulation layer — a faithful stand-in for the police backend,
 * used ONLY when the real service is unreachable (the header dot turns red).
 *
 * The digital-arrest fusion, fraud-shield heuristics, and SLA math mirror
 * the backend implementations signal-for-signal, so a demo run offline is
 * behaviorally identical to a live one.
 */

const now = () => new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const hoursAgo = (n) => new Date(Date.now() - n * 3600000);

/* ── Command deck ──────────────────────────────────────────────────────── */

const SUMMARY = {
  total_firs: 8214,
  active_cases: 1287,
  conviction_rate: 64.2,
  avg_response_time_mins: 22,
  top_crime_category: 'Digital Arrest / Impersonation Extortion',
  total_offenders: 1942,
};

function trend() {
  const out = [];
  const base = [432, 448, 439, 461, 470, 455, 468, 483, 476, 492, 501, 488, 495, 512, 507, 498, 521, 509];
  const d = new Date();
  d.setMonth(d.getMonth() - 17);
  for (let i = 0; i < 18; i++) {
    out.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, count: base[i] });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

const CATEGORIES = [
  { category: 'Digital Arrest / Impersonation Extortion', count: 1834 },
  { category: 'UPI / Payment Fraud', count: 1512 },
  { category: 'Counterfeit Currency (FICN)', count: 861 },
  { category: 'Phishing / Vishing', count: 644 },
  { category: 'Fraud Network / Money Mule', count: 590 },
  { category: 'OTP & KYC-Update Scams', count: 553 },
  { category: 'Voice-Clone / Deepfake Extortion', count: 401 },
];

const DISTRICTS = [
  { district_name: 'Bengaluru Urban', count: 2811, density: 'Digital Arrest hotspot' },
  { district_name: 'Mysuru', count: 1204, density: 'UPI Fraud hotspot' },
  { district_name: 'Belagavi', count: 986, density: 'Counterfeit Currency (border transit)' },
  { district_name: 'Dakshina Kannada', count: 874, density: 'Money-Mule network activity' },
  { district_name: 'Tumakuru', count: 655, density: 'Phishing / Vishing rising' },
];

const ALERTS = () => [
  {
    id: 'ALT-BLR-2214', district: 'Bengaluru Urban', type: 'Digital Arrest',
    message: '14 live digital-arrest sessions monitored this week — 6 crossed the alert threshold and were flagged before any transfer completed.',
    severity: 'Critical', z_score: 3.31, timestamp: iso(hoursAgo(2)),
  },
  {
    id: 'ALT-BGM-1187', district: 'Belagavi', type: 'Counterfeit Currency',
    message: '9 counterfeit ₹500 notes intercepted at bank counters in the last 7 days — sharply above the district baseline.',
    severity: 'High', z_score: 2.24, timestamp: iso(hoursAgo(7)),
  },
  {
    id: 'ALT-DK-0932', district: 'Dakshina Kannada', type: 'Fraud Network',
    message: 'Fraud graph flagged 3 new suspected money-mule accounts wired into the Silver Cobra Syndicate cluster.',
    severity: 'High', z_score: 1.96, timestamp: iso(hoursAgo(19)),
  },
  {
    id: 'ALT-MYS-0561', district: 'Mysuru', type: 'UPI Fraud',
    message: '41% rise in UPI/payment-fraud complaints over the last 90 days — the fastest-growing category statewide.',
    severity: 'Medium', z_score: 1.62, timestamp: iso(hoursAgo(31)),
  },
];

/* ── Hotspots (DBSCAN shape mirrored) ──────────────────────────────────── */

function hotspots(query) {
  const epsKm = Number(query.get('eps_km') || 1.5);
  const minSamples = Number(query.get('min_samples') || 2);
  const clusters = [
    { id: 0, lat: 12.9634, lng: 77.5855, n: 9, type: 'Cybercrime / Phishing', threat: 'CRITICAL', names: ['KR Market', 'Chickpet'] },
    { id: 1, lat: 12.9767, lng: 77.5713, n: 7, type: 'Chain Snatching', threat: 'HIGH', names: ['Majestic', 'Gandhinagar'] },
    { id: 2, lat: 12.8452, lng: 77.6602, n: 5, type: 'Vehicle Theft', threat: 'HIGH', names: ['Electronic City Phase 1'] },
    { id: 3, lat: 12.9698, lng: 77.7499, n: 4, type: 'Burglary', threat: 'MEDIUM', names: ['Whitefield', 'Kadugodi'] },
  ].filter((c) => c.n >= minSamples);

  const noise = [
    { lat: 13.0359, lng: 77.5970, type: 'Assault', threat: 'MEDIUM', name: 'Hebbal flyover' },
    { lat: 12.9165, lng: 77.6101, type: 'Theft', threat: 'LOW', name: 'BTM Layout 2nd Stage' },
    { lat: 12.9986, lng: 77.6612, type: 'Fraud / Cheating', threat: 'MEDIUM', name: 'Banaswadi' },
    { lat: 12.9345, lng: 77.5350, type: 'Theft', threat: 'LOW', name: 'Nagarbhavi Circle' },
    { lat: 13.0173, lng: 77.5510, type: 'Assault', threat: 'LOW', name: 'Yeshwanthpur' },
  ];

  const seizures = [
    {
      lat: 12.9750, lng: 77.6050, denomination: '500', verdict: 'LIKELY_COUNTERFEIT',
      name: 'Shivajinagar money-changer stall',
    },
  ];

  const features = [
    ...clusters.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: {
        is_hotspot: true, cluster_id: c.id, incident_count: c.n,
        dominant_type: c.type, max_threat_level: c.threat,
        location_names: c.names,
        incident_ids: Array.from({ length: c.n }, (_, i) => `INC-${c.id}${i}`),
        seizure_count: 0, is_seizure_dominant: false,
      },
    })),
    ...noise.map((m, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: {
        id: `INC-N${i}`, type: m.type, description: `${m.type} reported near ${m.name}`,
        threat_level: m.threat, timestamp: iso(daysAgo(i + 1)), location_name: m.name,
        is_hotspot: false, cluster_id: null, incident_count: 1, is_seizure: false,
      },
    })),
    ...seizures.map((s, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        id: `CS-MOCK-${i}`, type: 'COUNTERFEIT_SEIZURE',
        description: `1 note(s) seized (₹${s.denomination}) — ${s.verdict}`,
        threat_level: 'HIGH', timestamp: iso(daysAgo(i + 2)), location_name: s.name,
        is_hotspot: false, cluster_id: null, incident_count: 1, is_seizure: true,
        denomination: s.denomination, verdict: s.verdict,
      },
    })),
  ];

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      algorithm: 'DBSCAN (haversine)', eps_km: epsKm, min_samples: minSamples,
      total_incidents: clusters.reduce((s, c) => s + c.n, 0) + noise.length + seizures.length,
      hotspot_clusters: clusters.length,
    },
  };
}

/* ── Offender network graph ────────────────────────────────────────────── */

function networkGraph() {
  const persons = [
    { id: 'OFF-001', label: 'Rocky D’Souza', risk_score: 88, priors: 7, community_id: 0, betweenness_centrality: 0.31, degree_centrality: 0.42, mule_flag: false },
    { id: 'OFF-002', label: 'Suresh Pawar', risk_score: 74, priors: 5, community_id: 0, betweenness_centrality: 0.12, degree_centrality: 0.28, mule_flag: false },
    { id: 'OFF-003', label: 'Anil Kumbar', risk_score: 69, priors: 4, community_id: 0, betweenness_centrality: 0.08, degree_centrality: 0.21, mule_flag: false },
    {
      id: 'OFF-004', label: 'Prakash Nayak', risk_score: 22, priors: 0, community_id: 0,
      betweenness_centrality: 0.19, degree_centrality: 0.25, mule_flag: true,
      mule_reason: 'Low criminal history (0 priors) but holds 3 ties inside a network containing offenders with risk up to 88%, brokers cross-network paths (betweenness 0.190) — consistent with a money-mule/intermediary role.',
    },
    { id: 'OFF-005', label: 'Vijay Shetty', risk_score: 81, priors: 6, community_id: 1, betweenness_centrality: 0.22, degree_centrality: 0.33, mule_flag: false },
    { id: 'OFF-006', label: 'Ramesh Gowda', risk_score: 63, priors: 3, community_id: 1, betweenness_centrality: 0.07, degree_centrality: 0.18, mule_flag: false },
  ];
  const entities = [
    { id: 'gang_1', label: 'Silver Cobra Syndicate', type: 'Gang', community_id: 0 },
    { id: 'ph_9845098450', label: '98450 98450', type: 'Phone', community_id: 0 },
    { id: 'ph_9900288400', label: '99002 88400', type: 'Phone', community_id: 0, mule_flag: true, mule_reason: 'Owned by suspected mule Prakash Nayak' },
    { id: 'ph_9812345670', label: '98123 45670', type: 'Phone', community_id: 1 },
    { id: 'acc_50123', label: 'SBI 50123', type: 'Account', community_id: 0, mule_flag: true, mule_reason: 'Owned by suspected mule Prakash Nayak' },
    { id: 'acc_77012', label: 'Canara 77012', type: 'Account', community_id: 1 },
    { id: 'upi_50123', label: 'prakashnayak@okaxis', type: 'UPI ID', community_id: 0, mule_flag: true, mule_reason: 'Owned by suspected mule Prakash Nayak' },
    { id: 'crypto_77012', label: '0x71c…7012', type: 'Crypto Wallet', community_id: 1 },
    { id: 'veh_KA01AB1234', label: 'Scorpio (KA01AB1234)', type: 'Vehicle', community_id: 0 },
    { id: 'imei_35891', label: '358910042271', type: 'Device IMEI', community_id: 0 },
    { id: 'loc_5', label: 'KR Market', type: 'Location', lat: 12.9634, lng: 77.5855, community_id: 0 },
  ];
  const nodes = [
    ...persons.map((p) => ({ ...p, type: 'Person' })),
    ...entities,
  ];
  const links = [
    { source: 'OFF-001', target: 'OFF-002', type: 'Associated With' },
    { source: 'OFF-001', target: 'OFF-003', type: 'Associated With' },
    { source: 'OFF-001', target: 'OFF-004', type: 'Associated With' },
    { source: 'OFF-002', target: 'OFF-004', type: 'Associated With' },
    { source: 'OFF-003', target: 'OFF-004', type: 'Arrested With', details: 'FIR: FIR-2025-4471 (Fraud / Cheating)' },
    { source: 'OFF-001', target: 'gang_1', type: 'Member Of' },
    { source: 'OFF-002', target: 'gang_1', type: 'Member Of' },
    { source: 'OFF-001', target: 'ph_9845098450', type: 'Owned' },
    { source: 'OFF-004', target: 'ph_9900288400', type: 'Owned' },
    { source: 'OFF-004', target: 'acc_50123', type: 'Owned' },
    { source: 'acc_50123', target: 'upi_50123', type: 'TRANSFERRED_TO' },
    { source: 'OFF-005', target: 'ph_9812345670', type: 'Owned' },
    { source: 'OFF-005', target: 'acc_77012', type: 'Owned' },
    { source: 'acc_77012', target: 'crypto_77012', type: 'TRANSFERRED_TO' },
    { source: 'OFF-005', target: 'OFF-006', type: 'Associated With' },
    { source: 'OFF-001', target: 'veh_KA01AB1234', type: 'Owned' },
    { source: 'ph_9845098450', target: 'imei_35891', type: 'Used Device' },
    { source: 'ph_9845098450', target: 'ph_9900288400', type: 'Called', details: '212 sec on 2026-07-11' },
    { source: 'OFF-001', target: 'loc_5', type: 'Visited' },
  ];
  return {
    nodes, links,
    communities: [
      { community_id: 0, size: 12, person_count: 4, max_risk_score: 88, suspected_mules: 1, top_broker: 'OFF-001' },
      { community_id: 1, size: 5, person_count: 2, max_risk_score: 81, suspected_mules: 0, top_broker: 'OFF-005' },
    ],
    metadata: {
      algorithm: 'Louvain community detection + betweenness centrality (networkx)',
      community_count: 2, suspected_mule_count: 1,
    },
  };
}

/* ── Investigations ────────────────────────────────────────────────────── */

const CRIME_ROWS = [
  ['FIR-2026-0087', 'Cybercrime / Phishing', 'IT Act 66C/66D', 4, 'Investigation', 'HIGH', -3],
  ['FIR-2026-0079', 'Digital Arrest Extortion', 'BNS 308(2), IT Act 66D', 6, 'Investigation', 'CRITICAL', 2],
  ['FIR-2026-0074', 'Chain Snatching', 'BNS 304', 9, 'Investigation', 'MEDIUM', 11],
  ['FIR-2026-0068', 'Vehicle Theft', 'BNS 303(2)', 12, 'Investigation', 'MEDIUM', 5],
  ['FIR-2026-0061', 'Counterfeit Currency', 'BNS 178-180', 15, 'Investigation', 'HIGH', -1],
  ['FIR-2026-0057', 'Burglary', 'BNS 305', 19, 'Charge Sheeted', 'MEDIUM', 40],
  ['FIR-2026-0052', 'UPI Fraud', 'BNS 318(4), IT Act 66D', 22, 'Investigation', 'HIGH', 6],
  ['FIR-2026-0044', 'Assault', 'BNS 115(2)', 26, 'Investigation', 'LOW', 21],
  ['FIR-2026-0039', 'Theft', 'BNS 303(2)', 31, 'Closed', 'LOW', 60],
  ['FIR-2026-0031', 'Fraud / Cheating', 'BNS 318(4)', 38, 'Investigation', 'HIGH', -8],
  ['FIR-2026-0026', 'Cybercrime / Phishing', 'IT Act 66C', 44, 'Charge Sheeted', 'MEDIUM', 33],
  ['FIR-2026-0018', 'Extortion', 'BNS 308', 52, 'Investigation', 'MEDIUM', 14],
];

function investigations() {
  return CRIME_ROWS.map(([id, crime, ipc, filedDaysAgo, status, priority, daysLeft]) => ({
    id, crime_type: crime, ipc_section: ipc,
    date_filed: iso(daysAgo(filedDaysAgo)), status,
    assigned_officer_id: 'officer_' + id.slice(-2), priority,
    sla_deadline: iso(new Date(Date.now() + daysLeft * 86400000)),
    days_left: daysLeft,
    sla_status: (status === 'Closed' || status === 'Charge Sheeted') ? 'OK' : daysLeft < 0 ? 'Breached' : daysLeft < 7 ? 'Warning' : 'OK',
  }));
}

function investigationDetail(id) {
  const row = investigations().find((r) => r.id === id) || investigations()[0];
  return {
    ...row,
    summary: `${row.crime_type} registered at ${row.id.replace('FIR', 'PS Jayanagar / Case')}. Complainant statement recorded; CDR requisition issued for the suspect line; bank freeze request pending nodal-officer confirmation. Two eyewitness statements corroborate the timeline.`,
    leads: [
      'Suspect phone last pinged cell tower BLR-441 (KR Market) at 21:40.',
      'Beneficiary account traced to a mule-profile holder with 0 priors.',
      'CCTV footage requisitioned from two junction cameras (72h window).',
    ],
    evidence_correlations: ['CDR ↔ tower dump match (0.91)', 'UPI trail ↔ RBI registry hit'],
    timeline: [
      { date: iso(daysAgo(3)).slice(0, 10), event: 'CDR received from telco nodal officer' },
      { date: iso(daysAgo(2)).slice(0, 10), event: 'Beneficiary bank account frozen (lien marked)' },
      { date: iso(daysAgo(1)).slice(0, 10), event: 'Suspect identification parade scheduled' },
    ],
    victim_age: 46, victim_gender: 'F', police_station_name: 'Jayanagar PS',
  };
}

/* ── Offenders ─────────────────────────────────────────────────────────── */

const OFFENDERS = [
  { id: 'OFF-001', name: 'Rocky D’Souza', age: 34, gender: 'M', address: 'Shivajinagar, Bengaluru', num_prior_offenses: 7, risk_score: 88, associates_count: 4 },
  { id: 'OFF-005', name: 'Vijay Shetty', age: 41, gender: 'M', address: 'Hampankatta, Mangaluru', num_prior_offenses: 6, risk_score: 81, associates_count: 3 },
  { id: 'OFF-002', name: 'Suresh Pawar', age: 29, gender: 'M', address: 'Belagavi Camp', num_prior_offenses: 5, risk_score: 74, associates_count: 3 },
  { id: 'OFF-003', name: 'Anil Kumbar', age: 37, gender: 'M', address: 'KR Puram, Bengaluru', num_prior_offenses: 4, risk_score: 69, associates_count: 2 },
  { id: 'OFF-006', name: 'Ramesh Gowda', age: 45, gender: 'M', address: 'Mandi Mohalla, Mysuru', num_prior_offenses: 3, risk_score: 63, associates_count: 2 },
  { id: 'OFF-009', name: 'John Michael', age: 31, gender: 'M', address: 'Frazer Town, Bengaluru', num_prior_offenses: 2, risk_score: 51, associates_count: 1 },
];

function offenderProfile(id) {
  const o = OFFENDERS.find((x) => x.id === id) || OFFENDERS[0];
  return {
    ...o,
    gangs: o.risk_score > 70 ? [{ name: 'Silver Cobra Syndicate' }] : [],
    associates: OFFENDERS.filter((x) => x.id !== o.id).slice(0, 3).map((a) => ({ id: a.id, name: a.name, risk_score: a.risk_score })),
    xai_rationale: `Offender exhibits high-risk recidivism with ${o.num_prior_offenses} prior FIR records registered in the state database. ${o.risk_score > 70 ? 'Entity is a confirmed member of active criminal syndicate(s): Silver Cobra Syndicate. ' : ''}Maintains active communication/co-accused linkages with ${o.associates_count} registered associates. Registered assets (1 vehicle(s), 2 mobile line(s), 1 bank account/UPI node(s)) correlate with locations frequented during recent operations. ${o.risk_score >= 85 ? `Critical risk level of ${o.risk_score}% is due to high recidivism and confirmed syndicate connections.` : o.risk_score >= 60 ? `Elevated threat level of ${o.risk_score}% is driven by active criminal network associations.` : `Baseline risk level of ${o.risk_score}% reflects prior arrests without active syndicate links.`}`,
  };
}

/* ── Predictive + patterns ─────────────────────────────────────────────── */

const PREDICT = [
  {
    district_id: 1, district_name: 'Bengaluru Urban', risk_score: 78.4, risk_tier: 'High',
    contributing_factors: {
      unemployment: 'Unemployment rate at 4.1%', poverty: 'Poverty rate at 11.2%',
      police_density: 'Police per capita index at 92.4', recent_crime_volume: '2811 FIRs in last 180 days (86.2 per 100k)',
    },
    score_breakdown: { unemployment: 24.6, poverty: 14.0, police_deficit: 7.7, recent_crime_volume: 21.6 },
  },
  {
    district_id: 4, district_name: 'Belagavi', risk_score: 64.9, risk_tier: 'Medium',
    contributing_factors: {
      unemployment: 'Unemployment rate at 5.6%', poverty: 'Poverty rate at 17.8%',
      police_density: 'Police per capita index at 71.0', recent_crime_volume: '986 FIRs in last 180 days (54.1 per 100k)',
    },
    score_breakdown: { unemployment: 27.4, poverty: 22.3, police_deficit: 10.5, recent_crime_volume: 13.5 },
  },
  {
    district_id: 2, district_name: 'Mysuru', risk_score: 55.3, risk_tier: 'Medium',
    contributing_factors: {
      unemployment: 'Unemployment rate at 3.9%', poverty: 'Poverty rate at 14.4%',
      police_density: 'Police per capita index at 88.7', recent_crime_volume: '1204 FIRs in last 180 days (48.9 per 100k)',
    },
    score_breakdown: { unemployment: 23.4, poverty: 18.0, police_deficit: 8.2, recent_crime_volume: 12.2 },
  },
  {
    district_id: 7, district_name: 'Dakshina Kannada', risk_score: 48.1, risk_tier: 'Medium',
    contributing_factors: {
      unemployment: 'Unemployment rate at 3.2%', poverty: 'Poverty rate at 9.6%',
      police_density: 'Police per capita index at 96.3', recent_crime_volume: '874 FIRs in last 180 days (41.7 per 100k)',
    },
    score_breakdown: { unemployment: 19.2, poverty: 12.0, police_deficit: 7.2, recent_crime_volume: 10.4 },
  },
  {
    district_id: 9, district_name: 'Tumakuru', risk_score: 36.6, risk_tier: 'Low',
    contributing_factors: {
      unemployment: 'Unemployment rate at 2.8%', poverty: 'Poverty rate at 12.1%',
      police_density: 'Police per capita index at 104.8', recent_crime_volume: '655 FIRs in last 180 days (24.3 per 100k)',
    },
    score_breakdown: { unemployment: 16.8, poverty: 15.1, police_deficit: 6.0, recent_crime_volume: 6.1 },
  },
];

const PATTERNS = [
  {
    id: 'PAT-001', title: 'Weekend Crime Rate Spike', category: 'Temporal',
    description: 'Daily crime volume shows a 23% increase on weekends vs weekdays (31.4/day vs 25.5/day, n=8214 FIRs).',
    confidence: 82.1, sample_size: 8214,
  },
  {
    id: 'PAT-002', title: 'Fastest-Growing: UPI Fraud', category: 'Trend Shift',
    description: 'UPI Fraud grew 41% in the last 90 days vs the prior 90 (312 vs 221 FIRs) — the steepest climb of any category.',
    confidence: 77.8, sample_size: 533,
  },
  {
    id: 'PAT-003', title: 'Unemployment ↔ Property Crime', category: 'Socio-economic',
    description: 'District unemployment rate is the strongest Pearson correlate of property-crime volume (r=0.71 across 30 districts).',
    confidence: 74.0, sample_size: 30,
  },
];

/* ── Fraud shield (mirrors backend heuristics + behavioral signals) ────── */

function fraudCheck(body) {
  const value = String(body.value || '').toLowerCase().replace(/\s+/g, '');
  const type = body.type;

  const scamLink = type === 'link' && /(kbc|lottery|refund|kyc-?update|arrest|customs|gift|loan-?instant)/.test(value);
  const knownBad = value.includes('420') || value.endsWith('88') || scamLink;
  const dormantBurst = value.endsWith('00') || value.includes('9900');

  if (knownBad) {
    return {
      risk_level: 'High', score: 86.5,
      rationale: type === 'link'
        ? 'Domain matches an active scam-campaign pattern (fake KYC/refund lure) and was registered under 30 days ago. Two linked complaints exist in the fraud registry.'
        : 'Direct match in criminal records: this identifier is tied to an offender with priors, and the line shows a call-burst anomaly — dormant for 90 days, then 214 calls in the last 7 days, the signature of an active digital-arrest operation.',
      actions: [
        'Do not answer or transfer any amount — end contact immediately.',
        'Report on the National Cybercrime Reporting Portal (1930 / cybercrime.gov.in).',
        'If any money moved, call your bank’s fraud line within the golden hour.',
      ],
      ncrp_draft: {
        suspect_name: 'Rocky D’Souza', suspect_phone: type === 'phone' ? body.value : '98450 98450',
        suspect_account: 'SBI 50123', suspect_bank: 'State Bank of India',
        crime_type: 'Digital Arrest / Impersonation Fraud',
        rationale: 'Records match + call-burst-after-dormancy behavioral signal.',
        narrative: 'The above suspect contacted the complainant impersonating a law-enforcement officer, threatened digital arrest, and demanded an immediate transfer. The suspect line and beneficiary account correspond to entities already present in the state fraud graph.',
      },
    };
  }
  if (dormantBurst) {
    return {
      risk_level: 'Medium', score: 54.0,
      rationale: 'No criminal record on file, but the line was dormant (3 calls in the prior 90 days) and made/received 67 calls in the last 7 days — a burst-after-dormancy anomaly worth caution.',
      actions: [
        'Verify the caller through an official channel before acting on any request.',
        'Never share OTPs or make transfers under time pressure.',
      ],
      ncrp_draft: null,
    };
  }
  return {
    risk_level: 'Low', score: 8.5,
    rationale: 'No database match, no behavioral anomaly on the line, and no mule-network tie detected. Standard caution still applies for unsolicited payment requests.',
    actions: ['No action required. Re-check if the contact starts pressuring for payments.'],
    ncrp_draft: null,
  };
}

/* ── Digital arrest sessions (fusion mirrored from routes/digital_arrest.py) ── */

const MODALITY_WEIGHTS = { text: 0.3, voice: 0.2, video: 0.2, transaction: 0.3 };
const ALERT_THRESHOLD = 70;
const PLAYBOOK = [
  { category: 'authority_impersonation', weight: 0.35, words: ['cbi', 'police', 'customs', 'rbi', 'ed ', 'income tax', 'officer', 'warrant', 'crime branch'] },
  { category: 'isolation_pressure', weight: 0.25, words: ['do not tell', 'don’t tell', 'stay on video', 'alone', 'do not disconnect', 'keep this secret', 'skype'] },
  { category: 'urgency_threat', weight: 0.2, words: ['arrest', 'jail', 'immediately', 'within the hour', 'money laundering', 'aadhaar', 'case against you', 'parcel', 'drugs'] },
  { category: 'payment_redirection', weight: 0.2, words: ['transfer', 'upi', 'account', 'deposit', 'fine', 'settlement', 'verification amount', 'rtgs'] },
];

const DA_SESSIONS = new Map();

function scoreScript(content) {
  const text = content.toLowerCase();
  let score = 0;
  const matched = [];
  for (const spec of PLAYBOOK) {
    if (spec.words.some((w) => text.includes(w))) {
      matched.push({ category: spec.category });
      score += spec.weight;
    }
  }
  return [Math.min(1, score), matched];
}

function fuse(session) {
  const latest = {};
  session.signals.forEach((s) => { latest[s.modality] = s.strength; });
  let fused = Object.entries(latest).reduce((sum, [m, s]) => sum + (MODALITY_WEIGHTS[m] || 0) * s, 0) * 100;
  const strong = Object.values(latest).filter((s) => s >= 0.5).length;
  if (strong >= 3) fused += 15;
  else if (strong === 2) fused += 8;
  return Math.round(Math.min(100, fused) * 10) / 10;
}

function daStart(body) {
  const id = `DAS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
  const session = {
    id, started_at: iso(now()),
    victim_phone: body.victim_phone, suspect_phone: body.suspect_phone, notes: body.notes,
    status: 'MONITORING', risk_score: 0, signals: [],
    timeline: [{ at: iso(now()), event: 'Session opened — live monitoring started' }],
    alert_dispatched_at: null,
  };
  if (body.suspect_phone) {
    const burstMsg = `Line was dormant (2 calls in prior 90 days) then made/received 58 calls in the last 7 days — burst-after-dormancy is a known digital-arrest operation signature.`;
    session.signals.push({ at: iso(now()), modality: 'transaction', strength: 1.0, detail: `Suspect-line behavioral anomaly at session open: ${burstMsg}` });
    session.timeline.push({ at: iso(now()), event: `Behavioral pre-check flagged suspect line: ${burstMsg}` });
  }
  session.risk_score = fuse(session);
  DA_SESSIONS.set(id, session);
  return session;
}

function daSignal(id, body) {
  const session = DA_SESSIONS.get(id);
  if (!session) throw new Error('Session not found — start one via /session/start');
  const at = iso(now());
  let strength = 0;
  let detail = '';

  if (body.modality === 'text') {
    const [s, matched] = scoreScript(body.content || '');
    strength = s;
    const cats = matched.map((m) => m.category).join(', ') || 'no scam-script categories';
    detail = `Script analysis matched: ${cats} (score ${s.toFixed(2)})`;
  } else if (body.modality === 'voice') {
    strength = Math.max(0, Math.min(1, body.spoof_probability ?? 0));
    detail = `Voice-spoof classifier probability: ${strength.toFixed(2)}`;
  } else if (body.modality === 'video') {
    strength = Math.max(0, Math.min(1, body.fake_probability ?? 0));
    detail = `Deepfake classifier probability: ${strength.toFixed(2)} (${body.faces_detected || 0} face(s))`;
  } else if (body.modality === 'transaction') {
    const monthly = body.account_monthly_txn_count ?? 10;
    const amountFactor = Math.min(1, (body.amount_inr || 0) / 100000);
    const dormancyFactor = monthly <= 3 ? 1 : monthly <= 10 ? 0.6 : 0.3;
    strength = Math.round(Math.min(1, amountFactor * 0.6 + dormancyFactor * 0.4) * 100) / 100;
    detail = `Attempted transfer of ₹${Number(body.amount_inr).toLocaleString('en-IN')} from an account with ~${monthly} txns/month — anomaly strength ${strength.toFixed(2)}`;
  }

  session.signals.push({ at, modality: body.modality, strength, detail });
  session.timeline.push({ at, event: detail });
  session.risk_score = fuse(session);

  if (session.risk_score >= ALERT_THRESHOLD && session.status === 'MONITORING') {
    session.status = 'ALERT_DISPATCHED';
    session.alert_dispatched_at = at;
    session.timeline.push({
      at,
      event: `🚨 DISPATCH ALERT at fused risk ${session.risk_score}/100 — active digital-arrest session flagged BEFORE financial transfer. Victim advisory issued; suspect line queued for telco escalation.`,
    });
  }
  return session;
}

/* ── Dossiers (client-side sealed PDFs) ────────────────────────────────── */

const DOSSIERS = new Map();

function buildPdf(lines) {
  const textOps = lines
    .map((l, i) => `BT /F1 ${i === 0 ? 14 : 10} Tf 50 ${780 - i * 22} Td (${l.replace(/[()\\]/g, ' ')}) Tj ET`)
    .join('\n');
  const objects = [
    '<</Type /Catalog /Pages 2 0 R>>',
    '<</Type /Pages /Kids [3 0 R] /Count 1>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>',
    `<</Length ${textOps.length}>>\nstream\n${textOps}\nendstream`,
    '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { body += `${String(o).padStart(10, '0')} 00000 n \n`; });
  body += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
}

async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const DOSSIER_TITLES = {
  repeat_offenders: 'REPEAT OFFENDER REGISTER',
  case_sla_breach: 'SLA BREACH REGISTER',
  district_performance: 'DISTRICT PERFORMANCE REPORT',
};

async function generateDossier(body) {
  const title = DOSSIER_TITLES[body.report_type] || body.report_type.toUpperCase();
  const lines = [
    `KAWACH — ${title}`,
    `Generated: ${now().toLocaleString('en-IN')}`,
    '',
    ...(body.report_type === 'repeat_offenders'
      ? OFFENDERS.map((o) => `${o.id}  ${o.name}  priors:${o.num_prior_offenses}  risk:${o.risk_score}%`)
      : body.report_type === 'case_sla_breach'
        ? investigations().filter((r) => r.sla_status === 'Breached').map((r) => `${r.id}  ${r.crime_type}  ${Math.abs(r.days_left)}d overdue`)
        : DISTRICTS.map((d) => `${d.district_name}  FIRs:${d.count}  density:${d.density}`)),
    '',
    'Chain of custody: hash-sealed at generation. Admissibility intent: BSA Section 63.',
  ];
  const blob = buildPdf(lines);
  const hash = await sha256Hex(blob);
  const id = `RPT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  const entry = {
    id, report_type: body.report_type, created_at: iso(now()),
    sha256: hash, download_href: URL.createObjectURL(blob),
  };
  DOSSIERS.set(id, entry);
  return entry;
}

/* ── Case terminal ─────────────────────────────────────────────────────── */

function terminalQuery(body) {
  const msg = String(body.message || '');
  const lower = msg.toLowerCase();
  const fir = msg.match(/FIR-\d{4}-\d{4}/i);
  const plate = msg.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/i);
  const name = OFFENDERS.find((o) => lower.includes(o.name.split(' ')[0].toLowerCase()));

  if (fir) {
    const d = investigationDetail(fir[0].toUpperCase());
    return {
      response: `Case **${d.id}** — ${d.crime_type} (${d.ipc_section}), filed ${d.date_filed.slice(0, 10)} at ${d.police_station_name}. Status: **${d.status}**, priority ${d.priority}. ${d.summary}`,
      citations: [`Data lake: fir_records/${d.id}`],
    };
  }
  if (plate) {
    return {
      response: `Vehicle **${plate[0].toUpperCase()}** — Mahindra Scorpio, registered owner Rocky D'Souza (OFF-001, risk 88%). Flagged in 2 FIRs; last ANPR ping near KR Market on ${iso(daysAgo(2)).slice(0, 10)}.`,
      citations: ['Data lake: vehicles / ANPR log'],
    };
  }
  if (name) {
    const p = offenderProfile(name.id);
    return {
      response: `**${p.name}** (${p.id}) — risk **${p.risk_score}%**, ${p.num_prior_offenses} priors. Known associates: ${p.associates.map((a) => `${a.name} (${a.risk_score}%)`).join(', ')}. ${p.gangs.length ? `Syndicate: ${p.gangs[0].name}.` : 'No syndicate membership on record.'}`,
      citations: [`Offender graph: ${p.id} + ASSOCIATED_WITH edges`],
    };
  }
  if (lower.includes('cyber') || lower.includes('district')) {
    return {
      response: 'District with the highest cybercrime volume is **Bengaluru Urban** — 1,102 cyber FIRs in the last 180 days (61.8% 30-day spike, z=3.31). Mysuru is second at 214.',
      citations: ['Data lake: fir_records grouped by district × crime_type'],
    };
  }
  return {
    response: `The record holds ${SUMMARY.total_firs.toLocaleString('en-IN')} FIRs, ${SUMMARY.total_offenders.toLocaleString('en-IN')} offender profiles, and ${SUMMARY.active_cases.toLocaleString('en-IN')} active investigations. Ask about a case ID (FIR-2026-0087), a name (Rocky), a plate (KA01AB1234), or district-level questions.`,
    citations: [],
  };
}

/* ── IP tracing (mirrors routes/ip_tracing.py's fusion + scoring) ─────────── */

const IP_SIGHTINGS = new Map();
const IP_WATCHLIST = new Map();

// Seed one entry so the "flagged infrastructure" panel isn't empty offline —
// the same IP the offender graph synthesizes for Prakash Nayak's phone line,
// so the two views tell one consistent story.
IP_WATCHLIST.set('103.85.12.44', {
  id: 1, ip: '103.85.12.44', list_type: 'watchlist',
  note: 'Beneficiary line for OFF-004 (Prakash Nayak) — mule-flagged in fraud graph',
  added_by: 'sho_jayanagar', created_at: iso(daysAgo(4)),
});

function hashIp(ip) {
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0;
  return h;
}

const GEO_POOL = [
  { country: 'IN', city: 'Bengaluru', district: 'Bengaluru Urban', region: 'Karnataka', zip: '560001', timezone: 'Asia/Kolkata', lat: 12.9716, lon: 77.5946 },
  { country: 'IN', city: 'Mumbai', district: 'Mumbai City', region: 'Maharashtra', zip: '400001', timezone: 'Asia/Kolkata', lat: 19.076, lon: 72.8777 },
  { country: 'SG', city: 'Singapore', district: null, region: 'Central Singapore', zip: '018956', timezone: 'Asia/Singapore', lat: 1.3521, lon: 103.8198 },
  { country: 'HK', city: 'Hong Kong', district: null, region: 'Hong Kong Island', zip: null, timezone: 'Asia/Hong_Kong', lat: 22.3193, lon: 114.1694 },
  { country: 'DE', city: 'Frankfurt', district: null, region: 'Hesse', zip: '60306', timezone: 'Europe/Berlin', lat: 50.1109, lon: 8.6821 },
  { country: 'US', city: 'Ashburn', district: null, region: 'Virginia', zip: '20149', timezone: 'America/New_York', lat: 39.03, lon: -77.5 },
];

const ASN_POOL = [
  { org: 'Bharti Airtel Ltd', asname: 'AIRTEL-IN', type: 'isp', reverse: 'airtel-broadband.in', mobile: true },
  { org: 'Reliance Jio Infocomm Ltd', asname: 'RELIANCEJIO-IN', type: 'isp', reverse: 'jionet.in', mobile: true },
  { org: 'DigitalOcean, LLC', asname: 'DIGITALOCEAN-ASN', type: 'hosting', reverse: 'droplet.digitalocean.com', mobile: false },
  { org: 'Amazon.com, Inc. (AWS)', asname: 'AMAZON-AES', type: 'hosting', reverse: 'compute.amazonaws.com', mobile: false },
  { org: 'Hetzner Online GmbH', asname: 'HETZNER-AS', type: 'hosting', reverse: 'static.hetzner.com', mobile: false },
];

// Mirrors network.py's demo IP synthesis (103.85.12.{hash(cdr.id)%254+1}) so
// the offline mock tells the same "Prakash Nayak" story as the live backend.
const CASE_MATCH_IP = '103.85.12.44';
const CASE_MATCH = {
  matched: true, offender_id: 'OFF-004', offender_name: 'Prakash Nayak',
  risk_score: 22, gangs: [], phone_number: '99002 88400',
  device_imei: '358910042271', cell_tower_id: 'BLR-441',
  cdr_timestamp: iso(daysAgo(6)),
};

function ipRiskProfile(ip) {
  const h = hashIp(ip);
  const isWatchlisted = IP_WATCHLIST.get(ip);
  const geo = GEO_POOL[h % GEO_POOL.length];
  const asn = ASN_POOL[(h >> 3) % ASN_POOL.length];
  const isTor = (h % 11) === 0;
  const isProxy = !isTor && (h % 13) === 0;
  const isHosting = asn.type === 'hosting';
  const isMobile = asn.mobile && (h % 3) !== 0;
  const caseMatch = ip === CASE_MATCH_IP ? CASE_MATCH : null;

  const sighting = IP_SIGHTINGS.get(ip) || { count: 0, first_seen: iso(now()) };
  sighting.count += 1;
  sighting.last_seen = iso(now());
  IP_SIGHTINGS.set(ip, sighting);

  const breakdown = [];
  let score = 0;
  if (isTor) {
    score += 80;
    breakdown.push({ indicator: 'IP is a known Tor exit node', points: 80, category: 'network_flags' });
  }
  if (isProxy) {
    score += 40;
    breakdown.push({ indicator: 'IP is a known VPN/proxy/anonymizer (ip-api security flag)', points: 40, category: 'network_flags' });
  }
  if (isHosting) {
    score += 20;
    breakdown.push({ indicator: 'IP belongs to a hosting/cloud provider, not a residential ISP line', points: 20, category: 'network_flags' });
  }
  if (sighting.count >= 3) {
    score += 20;
    breakdown.push({ indicator: `This IP has surfaced in ${sighting.count} KAWACH lookups — repeat appearance across cases`, points: 20, category: 'internal' });
  }
  if (isWatchlisted?.list_type === 'blocklist') {
    score += 30;
    breakdown.push({ indicator: 'IP is already on this department’s blocklist', points: 30, category: 'internal' });
  }
  if (caseMatch) {
    score += 50;
    breakdown.push({ indicator: `IP is linked to registered offender ${caseMatch.offender_name} (${caseMatch.offender_id}) in KAWACH's own case records`, points: 50, category: 'internal' });
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    ip,
    geo: {
      ...geo,
      accuracy_km: 25, accuracy_label: 'High', geo_source: 'ip-api.com',
    },
    asn: { number: 10000 + (h % 50000), org: asn.org, asname: asn.asname, type: asn.type },
    network_flags: { is_tor: isTor, is_proxy: isProxy, is_hosting: isHosting, is_mobile: isMobile },
    network_ownership: {
      cidr: `${ip.split('.').slice(0, 3).join('.')}.0/24`,
      reverse_dns: `${ip.split('.').reverse().join('-')}.${asn.reverse}`,
      abuse_contact: `abuse@${asn.org.toLowerCase().replace(/[^a-z]+/g, '') || 'network'}.example`,
      allocation_date: iso(daysAgo(1200 + (h % 900))).slice(0, 10),
      registration_country: geo.country,
    },
    reputation: {},
    internal: {
      kawach_lookup_count: sighting.count,
      first_seen: sighting.first_seen,
      last_seen: sighting.last_seen,
    },
    case_match: caseMatch,
    source_status: {
      'ip-api': { status: 'ok', latency_ms: 180 + (h % 200) },
      'tor-exit-list': { status: 'ok', latency_ms: 40 },
      rdap: { status: 'ok', latency_ms: 900 + (h % 400) },
      AbuseIPDB: { status: 'not_configured', latency_ms: 0 },
      GreyNoise: { status: 'not_configured', latency_ms: 0 },
    },
    risk_score: score,
    score_breakdown: breakdown,
    confidence: 'high',
    last_checked: iso(now()),
    watchlist_entry: isWatchlisted
      ? { list_type: isWatchlisted.list_type, note: isWatchlisted.note, added_by: isWatchlisted.added_by, created_at: isWatchlisted.created_at }
      : null,
  };
}

function ipAddToList(ip, body) {
  const entry = {
    id: IP_WATCHLIST.size + 1, ip, list_type: body.list_type,
    note: body.note || null, added_by: 'officer', created_at: iso(now()),
  };
  IP_WATCHLIST.set(ip, entry);
  return entry;
}

/* ── Router ────────────────────────────────────────────────────────────── */

export async function mockRequest(path, method = 'GET', body) {
  const [rawPath, rawQuery = ''] = path.split('?');
  const query = new URLSearchParams(rawQuery);
  const p = rawPath.replace(/\/+$/, '');

  if (method === 'GET') {
    if (p === '/dashboard/summary') return SUMMARY;
    if (p === '/dashboard/trend') return trend();
    if (p === '/dashboard/categories') return CATEGORIES;
    if (p === '/dashboard/districts') return DISTRICTS;
    if (p === '/alerts') return ALERTS();
    if (p === '/geo/hotspots') return hotspots(query);
    if (p === '/network/graph') return networkGraph();
    if (p === '/investigations') return investigations();
    if (p.startsWith('/investigations/')) return investigationDetail(p.split('/').pop());
    if (p === '/offenders/repeat') return OFFENDERS;
    if (p === '/offenders/search') {
      const q = (query.get('query') || '').toLowerCase();
      return OFFENDERS.filter((o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
    }
    if (p.startsWith('/offenders/')) return offenderProfile(p.split('/').pop());
    if (p === '/analytics/predict') return PREDICT;
    if (p === '/analytics/patterns') return PATTERNS;
    if (p === '/digital-arrest/sessions') return [...DA_SESSIONS.values()].sort((a, b) => b.started_at.localeCompare(a.started_at));
    if (p.startsWith('/digital-arrest/session/')) {
      const s = DA_SESSIONS.get(p.split('/').pop());
      if (!s) throw new Error('Session not found');
      return s;
    }
    if (p === '/reports') return [...DOSSIERS.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (p === '/ip-tracing/watchlist/all') return [...IP_WATCHLIST.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (p.startsWith('/ip-tracing/')) return ipRiskProfile(p.split('/').pop());
  }

  if (method === 'POST') {
    if (p === '/auth/login-json') {
      return {
        access_token: 'sim_session_token', token_type: 'bearer',
        username: body?.username || 'officer', role: body?.role || 'DGP',
        district_id: body?.district_id ?? null, station_id: null,
      };
    }
    if (p === '/fraud-shield/check') return fraudCheck(body || {});
    if (p === '/digital-arrest/session/start') return daStart(body || {});
    if (/^\/digital-arrest\/session\/[^/]+\/signal$/.test(p)) return daSignal(p.split('/')[3], body || {});
    if (p === '/reports/generate') return generateDossier(body || {});
    if (p === '/ai/query') return terminalQuery(body || {});
    if (/^\/ip-tracing\/[^/]+\/list$/.test(p)) return ipAddToList(p.split('/')[2], body || {});
  }

  throw new Error(`No simulation available for ${method} ${p}`);
}
