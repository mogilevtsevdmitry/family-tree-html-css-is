import { layoutFamily } from "./services/layoutService.js";
import FamilyData from "./data.js";

const { nodes, unions } = layoutFamily(FamilyData.users, FamilyData.relations, {
  rootId: 1,
  levelGap: 180,
  colGap: 280,
  spouseGap: 80,
});

console.log(nodes);
console.log(unions);
