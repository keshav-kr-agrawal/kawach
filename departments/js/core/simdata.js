/**
 * Local simulation dataset — a realistic city ledger used ONLY when
 * Supabase is unreachable (the topbar dot turns red). Rows carry exactly
 * the DEPT_SAFE_COLUMNS shape, so every page renders identically.
 */

const h = (n) => new Date(Date.now() - n * 3600000).toISOString();

let seq = 0;
function r(dept, title, description, opts = {}) {
  seq += 1;
  return {
    id: `SIM-${String(seq).padStart(4, '0')}`,
    title,
    description,
    category: opts.category || dept,
    status: opts.status || 'OPEN',
    lat: opts.lat ?? 12.9 + (seq % 17) * 0.011,
    lng: opts.lng ?? 77.55 + (seq % 13) * 0.013,
    video_url: opts.video_url || null,
    timestamp: h(opts.hoursAgo ?? seq * 2),
    routed_department: dept,
    routing_priority: opts.priority || 'NORMAL',
    routing_reason: opts.reason || 'Classifier scene + text routing',
    escalation_required: opts.escalated || false,
    ai_verdict: opts.verdict || 'AUTHENTIC',
    confidence_level: opts.confidence ?? 0.91,
    trust_score: opts.trust ?? 78,
    civic_urgency_score: opts.urgency ?? 55,
    sub_category: opts.sub || null,
    upvotes: opts.upvotes ?? (seq * 3) % 11,
  };
}

export function buildSimReports() {
  seq = 0;
  return [
    // Roads (CONSTRUCTION + road subcategories / unlabeled)
    r('CONSTRUCTION', 'Deep pothole cluster on Hosur Road service lane', 'Three potholes near the Silk Board underpass entry; two-wheelers swerving into the main lane.', { sub: 'pothole', priority: 'HIGH', hoursAgo: 3, urgency: 74, escalated: true }),
    r('CONSTRUCTION', 'Road caving near storm drain, 9th Main Jayanagar', 'Asphalt sinking over a drain line; cordon needed before it collapses.', { sub: 'road_crack', priority: 'HIGH', hoursAgo: 26 }),
    r('CONSTRUCTION', 'Broken streetlight stretch, Outer Ring Road', 'Six consecutive poles dark between Marathahalli and Doddanekundi.', { sub: 'streetlight_broken', hoursAgo: 41 }),
    r('CONSTRUCTION', 'Gravel spill on Mysuru Road flyover ramp', 'Loose gravel from a truck across the left ramp lane.', { hoursAgo: 7 }),
    r('CONSTRUCTION', 'Repaired stretch reopened at KR Circle', 'Resurfacing complete; barricades cleared.', { sub: 'pothole', status: 'RESOLVED', hoursAgo: 70 }),
    // Buildings
    r('CONSTRUCTION', 'Cracked balcony slab, 4-storey block, Shivajinagar', 'Visible rebar and spalling concrete over a footpath; residents worried.', { sub: 'building_collapse', priority: 'CRITICAL', hoursAgo: 5, urgency: 88 }),
    r('CONSTRUCTION', 'Unauthorized third-floor extension, Padarayanapura', 'Construction continuing past sanctioned plan; debris falling to street.', { sub: 'illegal_construction', hoursAgo: 50 }),
    // Electricity
    r('ELECTRICITY', 'Sparking transformer near school gate', 'Transformer at 6th Cross Malleshwaram arcing during evening load; children pass within metres.', { priority: 'CRITICAL', hoursAgo: 2, urgency: 92, escalated: true }),
    r('ELECTRICITY', 'Live wire hanging after cable work', 'Contractor left a low-hanging line across the pavement on CMH Road.', { priority: 'HIGH', hoursAgo: 12 }),
    r('ELECTRICITY', 'Streetlong outage, HSR Sector 2', 'Whole feeder down since last night; homes and shops unpowered.', { hoursAgo: 18 }),
    // Water
    r('WATER', 'Burst main flooding 12th Cross', 'Cauvery line burst; water entering ground-floor homes.', { priority: 'HIGH', hoursAgo: 4, urgency: 81 }),
    r('WATER', 'Sewage mixing in drinking supply, Nagawara', 'Brown discolouration and odour reported by 14 households.', { priority: 'CRITICAL', hoursAgo: 9, escalated: true, urgency: 90 }),
    r('WATER', 'Leaking valve pit at Sankey Road', 'Continuous leak for three days; road edge eroding.', { hoursAgo: 66, status: 'RESOLVED' }),
    // Sanitation
    r('SANITATION', 'Garbage blackspot growing at market rear', 'Uncollected heap for 5 days behind Russell Market; stray-dog activity.', { priority: 'HIGH', hoursAgo: 15 }),
    r('SANITATION', 'Overflowing community bin, Ejipura', 'Bin overflowing onto the footpath near the bus stop.', { hoursAgo: 29 }),
    r('SANITATION', 'Dead animal on carriageway', 'Needs removal near Hebbal flyover loop.', { priority: 'HIGH', hoursAgo: 6 }),
    // Pollution & noise
    r('ENVIRONMENT', 'Industrial effluent into storm drain', 'Milky discharge from a unit in Peenya entering the drain at night.', { priority: 'HIGH', hoursAgo: 21 }),
    r('ENVIRONMENT', 'Construction noise past permitted hours', 'Piling work continuing till 1 AM at a Whitefield site.', { hoursAgo: 44 }),
    // Traffic
    r('TRAFFIC', 'Signal stuck on flashing amber, Trinity Circle', 'Peak-hour chaos; junction needs manual control or a fix.', { priority: 'HIGH', hoursAgo: 1, urgency: 70 }),
    r('TRAFFIC', 'Wrong-side movement at one-way exit', 'Repeated violations at Commercial Street exit endangering pedestrians.', { hoursAgo: 33 }),
    r('TRAFFIC', 'Fallen tree branch blocking left lane', 'Branch across the lane on Cunningham Road after wind.', { priority: 'HIGH', hoursAgo: 8, status: 'RESOLVED' }),
    // Fire (floor forces CRITICAL 15-min tier)
    r('FIRE', 'Smoke from godown ventilators, Chickpet', 'Persistent smoke smell and haze from a textile godown; shutters locked.', { priority: 'HIGH', hoursAgo: 0.4, urgency: 95 }),
    r('FIRE', 'LPG smell in apartment basement', 'Strong gas odour near parking cylinders bank, Kaggadasapura.', { priority: 'CRITICAL', hoursAgo: 0.2, urgency: 97, escalated: true }),
    // Health
    r('HEALTH', 'Suspected food poisoning cluster', '11 cases after a street-food stall near the college fest; stall still operating.', { priority: 'HIGH', hoursAgo: 10, urgency: 76 }),
    r('HEALTH', 'Stagnant water breeding site', 'Construction pit holding water for weeks in Mahadevapura — dengue risk.', { hoursAgo: 55 }),
    // Education
    r('EDUCATION', 'School compound wall leaning', 'Wall bulging towards the play area after rains, GHPS Yeshwanthpur.', { priority: 'HIGH', hoursAgo: 37 }),
    r('EDUCATION', 'Mid-day meal quality complaint', 'Parents report spoiled food twice this week at a Hoskote school.', { hoursAgo: 61 }),
    // Police
    r('POLICE', 'Chain snatching near metro exit', 'Two incidents this week at Majestic exit 3, evening hours; CCTV available.', { priority: 'HIGH', hoursAgo: 14, urgency: 79 }),
    r('POLICE', 'Digital arrest call targeting senior citizen', 'Caller posing as CBI kept victim on video for 2 hours demanding transfer; number shared.', { priority: 'CRITICAL', hoursAgo: 2.5, urgency: 94, escalated: true, verdict: 'SCAM_PATTERN', trust: 91 }),
    r('POLICE', 'Counterfeit ₹500 notes at vegetable market', 'Vendor received two suspect notes; security thread looks printed.', { priority: 'HIGH', hoursAgo: 24, verdict: 'SUSPECT_FEATURES', trust: 84 }),
    // Disaster fallback code (shows on Water + Police per matchCodes)
    r('DISASTER', 'Localized flooding under railway bridge', 'Knee-deep water pooling under the Okalipuram bridge after burst + rain.', { priority: 'HIGH', hoursAgo: 5, urgency: 83 }),
  ];
}
