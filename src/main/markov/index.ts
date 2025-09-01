// Markov model
// Training is done using relative note deltas.
// The model uses a maximum order to train up to that order, meaning that all the oders in between are present. E.g. for a number of 3 it would train for order 1, 2, 3.
// The model has fuzzy matching built in. This is used as a last resort when no exact match can be found.
// Can be trained with multiple sequences.
//
import { CLOCK_PER_BEAT_RESOLUTION, DEFAULT_MARKOV_ORDER } from "../constants";
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

export interface MarkovNextEntry {
  event: NoteEvent, count: number
}
export interface MarkovEntry {
  events: NoteEvent[],
  next: Map<string, MarkovNextEntry>
}


export interface MarkovModelData {
  transitions: Record<number, Map<
    string,
    MarkovEntry
  >>; // order->Key -> (Next -> Count)
  order: number;
}
export default class HigherOrderMarkovChain implements MarkovModelData {
  transitions: Record<number, Map<
    string,
    MarkovEntry
  >> = {}; // order->Key -> (Next -> Count)
  order: number;
  minFuzzyOrder: number;


  constructor(order?: number, minimalFuzzyOrder?: number) {
    this.order = Math.floor(order) || DEFAULT_MARKOV_ORDER;
    this.minFuzzyOrder = Math.floor(minimalFuzzyOrder || this.order / 2);
    if (this.minFuzzyOrder < 1) {
      this.minFuzzyOrder = 1;
    }
  }
  setOrder(order: number, minimalFuzzyOrder?: number) {
    this.order = Math.floor(order);
    this.minFuzzyOrder = Math.floor(minimalFuzzyOrder || this.order / 2);
    if (this.minFuzzyOrder < 1) {
      this.minFuzzyOrder = 1;
    }

  }
  export(): MarkovModelData {
    return {
      transitions: this.transitions, // order->Key -> (Next -> Count)
      order: this.order,
    };
  }
  import(data: MarkovModelData) {
    this.transitions = { ...data.transitions };
    this.order = data.order;
  }

  private internaliseSequence(sequence: NoteEvent[], order: number) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }
    if (!this.transitions[order]) {
      this.transitions[order] = new Map();
    }
    for (let i = 0; i <= sequence.length - this.order - 1; i++) {
      const currentSequence = sequence.slice(i, i + order);
      const key = this.encodeSequence(currentSequence);
      const nextEvent = sequence[i + order];
      const next = this.encodeSequence(nextEvent);
      if (!this.transitions[order].has(key)) {
        this.transitions[order].set(key,
          {
            events: currentSequence,
            next: new Map(),
          }
        );
      }

      const nextMap = this.transitions[order].get(key).next;
      const oldOne = nextMap.get(next) || { event: nextEvent, count: 0 };
      const newOne = { ...oldOne };
      newOne.count++;
      nextMap.set(next, newOne);
    }
  }
  private analyseModel(sequenceLength: number) {
    const logLine = (order: number, repetitionPercentage: number) => {
      console.log(`${order}\t${Math.round(repetitionPercentage * 10) / 10}%`);
    }
    console.log(`Order\tRepetition in %`);
    for (let i = this.order; i > 0; i--) {
      const orderLength = sequenceLength - i;
      logLine(i, (1 - this.transitions[i].size / orderLength) * 100);
    }
  }

  addSequence(sequence: NoteEvent[]) {
    if (sequence.length < this.order + 1) {
      throw new Error('Sequence too short for this order');
    }
    // calculates everything
    for (let i = this.order; i > 0; i--) {
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

  generate(start: NoteEvent[], bars: number, beatsPerBar = 4): NoteEvent[] {
    return this.generateBarsFuzzy(start, bars, beatsPerBar);
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
    let currentTimeSum = start.reduce((sum, e) => sum + (e.deltaTime || 0), 0);
    console.log('generating bars');
    console.log(start);

    while (currentTimeSum <= totalTargetTime) {
      let next: NoteEvent | undefined = undefined;

      for (let k = this.order; k >= 1; k--) {
        const key = this.encodeSequence(current.slice(-k)); // Use last k elements
        const possibleNext = this.transitions[this.order].get(key);

        if (possibleNext && possibleNext.next.size > 0) {
          const nextStr = this.weightedRandomChoice(possibleNext.next);
          next = nextStr;
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

  private findMatchAccrossOrders(sequence: NoteEvent[], minOrder?: number) {

    let next: NoteEvent | undefined = undefined;
    const minimumOrder = minOrder || 1;

    // Try exact matching first
    for (let k = this.order; k >= minimumOrder; k--) {
      const key = this.encodeSequence(sequence.slice(-k)); // Use last k elements
      const possibleNext = this.transitions[k].get(key);

      if (possibleNext && possibleNext.next.size > 0) {
        const nextStr = this.weightedRandomChoice(possibleNext.next);
        next = nextStr;
        break;
      }
    }
    return next;
  }
  private findMatchFuzzy(sequence: NoteEvent[], minOrder?: number) {
    const minimumOrder = minOrder || this.minFuzzyOrder || 1;
    let bestMatch: { key: string, order: number } | undefined = undefined;
    let bestDistance = Infinity;
    let bestDistancePreviousRound = Infinity;

    for (let i = minimumOrder; i <= this.order; i++) {
      const current = sequence.slice(-i);
      const currentEntries = this.transitions[i].entries();
      let currentRoundBestDistance = Infinity;
      for (const candidate of currentEntries) {
        const dist = sequenceDistance(candidate[1].events, current);
        if (dist < currentRoundBestDistance) {
          currentRoundBestDistance = dist;
        }
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = {
            key: candidate[0],
            order: i,
          };
        }
      }
      // break early if no better match is found in higher orders
      if (currentRoundBestDistance > bestDistancePreviousRound) {
        console.log('no better match found', currentRoundBestDistance, bestDistancePreviousRound);
        break;
      }
      bestDistancePreviousRound = currentRoundBestDistance;
    }

    if (bestMatch) {
      console.log('fuzzily matched, with distance', bestDistance, bestMatch);

      const possibleNext = this.transitions[bestMatch.order].get(bestMatch.key);
      if (possibleNext && possibleNext.next.size > 0) {
        const nextOne = this.weightedRandomChoice(possibleNext.next);
        return nextOne;
      }
    }
    return undefined;
  }
  generateBarsFuzzy(start: NoteEvent[], bars: number, beatsPerBar = 4): NoteEvent[] {

    if (start.length < this.order) {
      throw new Error(`Start sequence must have at least ${this.order} elements`);
    }
    const startTimeSum = start.reduce((sum, e) => sum + (e.deltaTime || 0), 0);
    const startLength = start.length;
    const totalTargetTime = bars * beatsPerBar * CLOCK_PER_BEAT_RESOLUTION;


    const result: NoteEvent[] = [...start];
    let current = [...start];
    let currentTimeSum = start.reduce((sum, e) => sum + (e.deltaTime || 0), 0);

    while (currentTimeSum - startTimeSum <= totalTargetTime) {
      let next: NoteEvent | undefined = undefined;
      next = this.findMatchAccrossOrders(result);
      // Fuzzy match if no exact match found
      if (!next) {
        next = this.findMatchFuzzy(result);
      }

      if (!next) {
        console.log('No possible next step even with fuzzy matching, stopping generation.');
        break;
      }
      result.push(next);
      currentTimeSum += next.deltaTime || 0;
      current = [...current.slice(1), next];
    }
    return result.slice(startLength);
  }

  private weightedRandomChoice(counts: Map<string, { event: NoteEvent, count: number }>): NoteEvent {
    const entries = Array.from(counts.entries());
    const totalWeight = entries.reduce((sum, entry) => sum + entry[1].count, 0);
    const items: NoteEvent[] = [];
    entries.map((entry) => {
      for (let i = 0; i < entry[1].count; i++) {
        items.push(entry[1].event);
      }
    });
    const rand = Math.floor(Math.random() * totalWeight);
    const res = items[rand];
    if (res) {
      return res;
    }
    return entries[0][1].event;
  }
}
