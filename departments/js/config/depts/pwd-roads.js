// 1. Public Works – Roads (PWD)
export default {
  id: 'pwd-roads',
  name: 'Public Works – Roads (PWD)',
  icon: '🛣️',
  color: 'orange',
  handles: ['Potholes', 'Road damage', 'Verified by scene classification on submitted video/photo'],
  matchCodes: ['CONSTRUCTION'],
  // Which CONSTRUCTION sub-categories belong to Roads (vs Buildings)
  subCategories: ['pothole', 'road_crack', 'bridge_damage', 'streetlight_broken'],
  claimUnlabeled: true, // generic CONSTRUCTION reports default to Roads
};
