// 8. Fire & Emergency Services — always routed at the highest SLA priority
export default {
  id: 'fire',
  name: 'Fire & Emergency Services',
  icon: '🔥',
  color: 'red',
  handles: ['Fire hazards', 'Active fire incidents'],
  matchCodes: ['FIRE'],
  minPriority: 'CRITICAL', // SLA floor: every fire report gets the 15-min tier
};
