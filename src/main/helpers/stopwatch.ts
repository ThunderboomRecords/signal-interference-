
export class StopWatch {
  startTime: number;
  endTime: number;
  constructor() {
    this.startTime = Date.now();
  }
  stop() {
    this.endTime = Date.now();
    const delta = this.endTime - this.startTime;
    return delta;
  }
  reset() {
    this.startTime = Date.now();
  }
}

export default StopWatch;
