export function sequenceDistance<T extends NoteEvent>(a: T[], b: T[]): number {
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    distance += Math.abs(a[i].note - b[i].note);
    distance += Math.abs(a[i].deltaTime - b[i].deltaTime);
    distance += Math.abs(a[i].duration - b[i].duration);
  }
  return distance;
}
class HigherOrderMarkovChain<T> {
  transitions: Map<string, Map<string, number>> = new Map(); // Key -> (Next -> Count)
  order: number;

  constructor(order: number) {
    this.order = order;
  }

  addSequence(sequence: T[]) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }

    for (let i = 0; i <= sequence.length - this.order - 1; i++) {
      const key = JSON.stringify(sequence.slice(i, i + this.order));
      const next = JSON.stringify(sequence[i + this.order]);

      if (!this.transitions.has(key)) {
        this.transitions.set(key, new Map());
      }

      const nextMap = this.transitions.get(key)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
  }

  generate(start: T[], length: number): T[] {
    // TODO: Make sure it can handle less or more input notes
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const result: T[] = [...start];
    let current = [...start];

    for (let i = 0; i < length - this.order; i++) {
      let next: T | undefined = undefined;

      for (let k = this.order; k >= 1; k--) {
        const key = JSON.stringify(current.slice(-k)); // Use last k elements
        const possibleNext = this.transitions.get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = JSON.parse(nextStr) as T;
          break; // Found a match at this k
        }
      }

      if (!next) {
        break; // No transition found at any order
      }

      result.push(next);
      current = [...current.slice(1), next];
    }

    return result;
  }
  generateBars(start: T[], bars: number, bpm: number, beatsPerBar = 4): T[] {
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    const totalTargetTime = secondsPerBar * bars;

    const result: T[] = [...start];
    let current = [...start];
    let currentTimeSum = start.reduce((sum, e: any) => sum + (e.deltaTime || 0), 0);
    console.log('generating bars');
    console.log(start);

    while (currentTimeSum <= totalTargetTime) {
      let next: T | undefined = undefined;

      for (let k = this.order; k >= 1; k--) {
        const key = JSON.stringify(current.slice(-k));
        const possibleNext = this.transitions.get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = JSON.parse(nextStr) as T;
          break;
        }
      }

      if (!next) {
        console.error('could not calculate a next one');
        break;
      }

      result.push(next);
      currentTimeSum += (next as any).deltaTime || 0;
      current = [...current.slice(1), next];
    }

    return result;
  }
  generateBarsFuzzy(start: T[], bars: number, bpm: number, beatsPerBar = 4): T[] {
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    const totalTargetTime = secondsPerBar * bars;

    const result: T[] = [...start];
    let current = [...start];
    let currentTimeSum = start.reduce((sum, e: any) => sum + (e.deltaTime || 0), 0);

    while (currentTimeSum < totalTargetTime) {
      let next: T | undefined = undefined;

      // Try exact matching first
      for (let k = this.order; k >= 1; k--) {
        const key = JSON.stringify(current.slice(-k));
        const possibleNext = this.transitions.get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = JSON.parse(nextStr) as T;
          break;
        }
      }

      // Fuzzy match if no exact match found
      if (!next) {
        const allKeys = Array.from(this.transitions.keys()).map(k => JSON.parse(k) as T[]);
        let bestMatch: T[] | null = null;
        let bestDistance = Infinity;

        for (const candidate of allKeys) {
          if (candidate.length !== current.length) continue; // Match only same order
          const dist = sequenceDistance(candidate, current);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestMatch = candidate;
          }
        }

        if (bestMatch) {
          console.log('fuzzily matched, with distance', bestDistance);
          const possibleNext = this.transitions.get(JSON.stringify(bestMatch));
          if (possibleNext && possibleNext.size > 0) {
            const nextStr = this.weightedRandomChoice(possibleNext);
            next = JSON.parse(nextStr) as T;
          }
        }
      }

      if (!next) {
        console.log('No possible next step even with fuzzy matching, stopping generation.');
        break;
      }

      result.push(next);
      currentTimeSum += (next as any).deltaTime || 0;
      current = [...current.slice(1), next];
    }

    return result;
  }

  private weightedRandomChoice(counts: Map<string, number>): string {
    const entries = Array.from(counts.entries());
    const totalWeight = entries.reduce((sum, [, count]) => sum + count, 0);

    let rand = Math.random() * totalWeight;
    for (const [item, weight] of entries) {
      if (rand < weight) {
        return item;
      }
      rand -= weight;
    }

    return entries[entries.length - 1][0]; // Fallback
  }
}
export default HigherOrderMarkovChain;
