// 11. Police (crime classifier) — the deepest branch (build spec §6.4).
// Crimes, digital arrest, counterfeit/fraud cases. This dashboard shows the
// routed queue; the full command console (offender graph, hotspots, evidence
// export) is the separate police/ app.
export default {
  id: 'police',
  name: 'Police & Law Enforcement',
  icon: '🚔',
  color: 'blue',
  handles: ['Crimes & public safety', 'Digital arrest / fraud cases', 'Counterfeit currency reports'],
  matchCodes: ['POLICE', 'DISASTER'],
  minPriority: 'HIGH', // crime tier floor per spec §6.3 (digital-arrest reports carry CRITICAL themselves)
};
