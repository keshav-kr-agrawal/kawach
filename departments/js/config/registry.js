/**
 * Department registry — build spec principle #3: ONE dashboard shell,
 * parameterized by department config. Add a department by adding one small
 * file in depts/ and importing it here; no dashboard code changes needed.
 */

import pwdRoads from './depts/pwd-roads.js';
import pwdBuildings from './depts/pwd-buildings.js';
import electricity from './depts/electricity.js';
import water from './depts/water.js';
import sanitation from './depts/sanitation.js';
import pollutionNoise from './depts/pollution-noise.js';
import traffic from './depts/traffic.js';
import fire from './depts/fire.js';
import health from './depts/health.js';
import education from './depts/education.js';

export const DEPARTMENTS = [
  pwdRoads, pwdBuildings, electricity, water, sanitation,
  pollutionNoise, traffic, fire, health, education,
];

export function getDepartment(id) {
  return DEPARTMENTS.find(d => d.id === id) || null;
}

/**
 * Does this report belong to this department?
 * Match on routed_department code; when two departments share a code
 * (PWD Roads vs Buildings on CONSTRUCTION), sub_category decides, and
 * unlabeled reports go to the department with claimUnlabeled=true.
 */
export function reportBelongsTo(report, dept) {
  if (!dept.matchCodes.includes(report.routed_department)) return false;
  if (!dept.subCategories) return true;
  const sub = (report.sub_category || '').toLowerCase();
  if (!sub) return !!dept.claimUnlabeled;
  return dept.subCategories.some(s => sub.includes(s) || s.includes(sub));
}
