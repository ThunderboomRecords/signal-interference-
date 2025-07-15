import { s } from "vite/dist/node/types.d-aGj9QkWt";
import { CLOCKS_PER_BEAT, CLOCK_PER_BEAT_RESOLUTION } from "../constants";
import type { NoteEvent } from "../types";
export function sequenceDistance(a: NoteEvent[], b: NoteEvent[]): number {
  let distance = 0;

  for (let i = 0; i < a.length; i++) {
    distance += Math.abs(a[i].note - b[i].note);
    distance += Math.abs(a[i].deltaTime - b[i].deltaTime);
    distance += Math.abs(a[i].duration - b[i].duration);
  }
  return distance;
}
class HigherOrderMarkovChain {
  transitions: Record<number, Map<string, Map<string, number>>> = {}; // order->Key -> (Next -> Count)
  order: number;
  transitionsDownSampled: Record<number, Record<number, Map<string, Map<string, number>>>> = {}; // order -> downsampledivision -> key -> next -> count


  constructor(order?: number) {
    this.order = order;
  }
  setOrder(order: number) {
    this.order = order;
  }

  private downSampleSequence(sequence: NoteEvent[], divisor: number) {
    return sequence.map((event) => {
      return {
        note: event.note,
        deltaTime: Math.round(event.deltaTime / divisor),
        duration: Math.round(event.duration / divisor)
      }
    });
  }
  addSequenceDownsampled(sequence: NoteEvent[], timeDivision: number, order: number) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }
    if (!this.transitionsDownSampled[order]) {
      this.transitionsDownSampled[order] = {};
    }

    this.transitionsDownSampled[order][timeDivision] = new Map();
    for (let i = 0; i <= sequence.length - this.order - 1; i++) {
      const downSampledSequence = this.downSampleSequence(sequence, timeDivision);

      const key = this.encodeSequence(downSampledSequence.slice(i, i + order));
      const next = this.encodeSequence(sequence[i + order]);
      if (!this.transitionsDownSampled[order][timeDivision].has(key)) {
        this.transitionsDownSampled[order][timeDivision].set(key, new Map());
      }
      const nextMap = this.transitionsDownSampled[order][timeDivision].get(key)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
  }
  private internaliseSequence(sequence: NoteEvent[], order: number) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }
    if (!this.transitions[order]) {
      this.transitions[order] = new Map();
    }
    for (let i = 0; i <= sequence.length - this.order - 1; i++) {
      const key = this.encodeSequence(sequence.slice(i, i + order));
      const next = this.encodeSequence(sequence[i + order]);
      if (!this.transitions[order].has(key)) {
        this.transitions[order].set(key, new Map());
      }

      const nextMap = this.transitions[order].get(key)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
    console.log('did normal transitions');

    console.log('downsampling: ');

    for (let i = 2; i <= CLOCK_PER_BEAT_RESOLUTION; i += 2) {
      this.addSequenceDownsampled(sequence, i, order);
      console.log(i);
    }
  }
  private analyseModel(sequenceLength: number) {
    const logLine = (order: number, downsample: number, repetitionPercentage: number) => {
      console.log(`${order}\t${downsample}\t\t\t${Math.round(repetitionPercentage * 10) / 10}%`);
    }
    console.log(`Order\tDownsampleDivisor\tRepetition in %`);
    for (let i = this.order; i > 0; i--) {
      const orderLength = sequenceLength - i;
      logLine(i, 1, (1 - this.transitions[i].size / orderLength) * 100);
      for (let downsample = 2; downsample <= CLOCK_PER_BEAT_RESOLUTION; downsample += 2) {
        logLine(i, downsample, (1 - this.transitionsDownSampled[i][downsample].size / orderLength) * 100);
      }
    }
  }

  addSequence(sequence: NoteEvent[]) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }
    // calculates everything
    for (let i = this.order; i > 0; i--) {
      console.log('adding sequence for oder: ', i);
      this.internaliseSequence(sequence, i);
    }
    this.analyseModel(sequence.length);
  }
  encodeSequence(sequence: NoteEvent[] | NoteEvent) {
    if (!Array.isArray(sequence)) {
      sequence = [sequence];
    }
    const result = sequence.reduce((prev, note) => {
      return prev + `${note.note}+${note.deltaTime}+${note.duration};`;
    }, '');
    return result;
  }
  decodeSequence(sequence: string): NoteEvent[] {
    const arr = sequence.split(';').filter((val) => val !== '') as string[];
    const notes: NoteEvent[] = arr.map((input) => {
      const [note, deltaTime, duration] = input.split('+');
      return {
        note: parseInt(note),
        deltaTime: parseInt(deltaTime),
        duration: parseInt(duration),
      }
    });
    return notes;
  }

  generate(start: NoteEvent[], length: number): NoteEvent[] {
    // TODO: Make sure it can handle less or more input notes
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const result: NoteEvent[] = [...start];
    let current = [...start];

    for (let i = 0; i < length - this.order; i++) {
      let next: NoteEvent | undefined = undefined;

      for (let k = this.order; k >= 1; k--) {
        const key = this.encodeSequence(current.slice(-k)); // Use last k elements
        // const key = JSON.stringify(current.slice(-k)); // Use last k elements
        const possibleNext = this.transitions[this.order].get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = this.decodeSequence(nextStr)[0];
          // next = JSON.parse(nextStr) as NoteEvent;
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
  generateBars(start: NoteEvent[], bars: number, bpm: number, beatsPerBar = 4): NoteEvent[] {
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    const totalTargetTime = secondsPerBar * bars;

    const result: NoteEvent[] = [...start];
    let current = [...start];
    let currentTimeSum = start.reduce((sum, e: any) => sum + (e.deltaTime || 0), 0);
    console.log('generating bars');
    console.log(start);

    while (currentTimeSum <= totalTargetTime) {
      let next: NoteEvent | undefined = undefined;

      for (let k = this.order; k >= 1; k--) {
        const key = this.encodeSequence(current.slice(-k)); // Use last k elements
        const possibleNext = this.transitions[this.order].get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = this.decodeSequence(nextStr)[0];
          break;
        }
      }

      if (!next) {
        console.error('could not calculate a next one');
        break;
      }

      result.push(next);
      currentTimeSum += (next).deltaTime || 0;
      current = [...current.slice(1), next];
    }

    return result;
  }
  generateBarsFuzzy(start: NoteEvent[], bars: number, beatsPerBar = 4): NoteEvent[] {
    testEncoding();
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const startTimeSum = start.reduce((sum, e: any) => sum + (e.deltaTime || 0), 0);
    const startLength = start.length;
    const totalTargetTime = bars * beatsPerBar * CLOCK_PER_BEAT_RESOLUTION;


    const result: NoteEvent[] = [...start];
    let current = [...start];
    let currentTimeSum = start.reduce((sum, e: any) => sum + (e.deltaTime || 0), 0);
    console.log({
      startTimeSum,
      startLength,
      totalTargetTime,
      map: this.transitions,
    });


    while (currentTimeSum - startTimeSum <= totalTargetTime) {
      let next: NoteEvent | undefined = undefined;

      // Try exact matching first
      for (let k = this.order; k >= 1; k--) {
        const key = this.encodeSequence(current.slice(-k)); // Use last k elements
        const possibleNext = this.transitions[this.order].get(key);

        if (possibleNext && possibleNext.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext);
          next = this.decodeSequence(nextStr)[0];
          break;
        }
      }

      // Fuzzy match if no exact match found
      if (!next) {
        const allKeys = Array.from(this.transitions[this.order].keys()).map(k => this.decodeSequence(k) as NoteEvent[]);
        let bestMatch: NoteEvent[] | null = null;
        let bestDistance = Infinity;

        // TODO: double check this it ends up using a lot of the same phrases for best distance. Should recude this somewhat.
        // TODO: also use the order reduction.
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
          const key = this.encodeSequence(bestMatch);
          const possibleNext = this.transitions[this.order].get(key);
          if (possibleNext && possibleNext.size > 0) {
            const nextStr = this.weightedRandomChoice(possibleNext);
            next = this.decodeSequence(nextStr)[0];
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
    return result.slice(startLength);
  }
  countDifferentNumbersInTransitions(): number {
    const uniqueNumbers = new Set<number>();

    for (const [, nextMap] of this.transitions[this.order]) {
      for (const count of nextMap.values()) {
        uniqueNumbers.add(count);
      }
    }

    return uniqueNumbers.size;
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
function testEncoding() {
  const originalSequence = [
    { note: 60, deltaTime: 100, duration: 200 },
    { note: 62, deltaTime: 150, duration: 250 },
    { note: 64, deltaTime: 200, duration: 300 },
  ];

  const higherOrderMarkovChain = new HigherOrderMarkovChain(2);
  const encoded = higherOrderMarkovChain.encodeSequence(originalSequence);
  const decoded = higherOrderMarkovChain.decodeSequence(encoded);

  console.log("Original:", originalSequence);
  console.log("Encoded:", encoded);
  console.log("Decoded:", decoded);

  if (JSON.stringify(originalSequence) !== JSON.stringify(decoded)) {
    console.error("Encoding or decoding is incorrect.");
  } else {
    console.log("Encoding and decoding are correct.");
  }

}
