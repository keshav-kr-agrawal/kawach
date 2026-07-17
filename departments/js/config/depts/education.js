// 10. Education Department
// NOTE: the classifier's 10-code scheme has no EDUCATION code yet — school
// reports currently arrive under REVENUE (unauthorized structures) or GENERAL.
// Claiming EDUCATION future-proofs the routing without faking data today.
export default {
  id: 'education',
  name: 'Education Department',
  icon: '🏫',
  color: 'indigo',
  handles: ['School infrastructure issues', 'School accessibility and facility-related complaints'],
  matchCodes: ['EDUCATION', 'REVENUE'],
};
