import { ticksToVexflowDuration } from "./helpers";

console.log(ticksToVexflowDuration(96));  // 'q'
console.log(ticksToVexflowDuration(48));  // '8'
console.log(ticksToVexflowDuration(72));  // '8d'
console.log(ticksToVexflowDuration(12));  // '32'
