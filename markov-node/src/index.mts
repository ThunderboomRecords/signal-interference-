import ToneJS from '@tonejs/midi';
const { Midi, Track } = ToneJS;
import * as fs from 'fs';

type NoteEvent = { note: number; deltaTime: number; duration: number };

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
    if (start.length !== this.order) {
      throw new Error(`Start sequence must have exactly ${this.order} elements`);
    }

    const result: T[] = [...start];
    let current = [...start];

    for (let i = 0; i < length - this.order; i++) {
      const key = JSON.stringify(current);
      const possibleNext = this.transitions.get(key);

      if (!possibleNext || possibleNext.size === 0) {
        break;
      }

      const nextStr = this.weightedRandomChoice(possibleNext);
      const next = JSON.parse(nextStr) as T;
      result.push(next);

      // Slide the window
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

    // Fallback
    return entries[entries.length - 1][0];
  }
}

async function parseMidiFile(filePath: string): Promise<NoteEvent[]> {
  const input = fs.readFileSync(filePath);
  const midi = new Midi(input);

  const notes = midi.tracks[0].notes;
  let events: NoteEvent[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const previousTime = i > 0 ? notes[i - 1].time : 0;
    const deltaTime = note.time - previousTime;

    events.push({
      note: note.midi,
      deltaTime,
      duration: note.duration
    });
  }

  return events;
}

async function saveMidiFile(events: NoteEvent[], filePath: string) {
  const midi = new Midi();
  const track = midi.addTrack();

  let currentTime = 0;

  for (const event of events) {
    currentTime += event.deltaTime;

    track.addNote({
      midi: event.note,
      time: currentTime,
      duration: event.duration
    });
  }

  const output = midi.toArray();
  fs.writeFileSync(filePath, Buffer.from(output));
}

async function run() {
  const notes = await parseMidiFile('assets/midi/solo.mid');
  console.log('Parsed Notes:', notes);

  const order = 2; // Higher-order chain
  const chain = new HigherOrderMarkovChain<NoteEvent>(order);
  chain.addSequence(notes);

  const startIdx = Math.floor(Math.random() * (notes.length - order));
  const startSequence = notes.slice(startIdx, startIdx + order);

  const generated = chain.generate(startSequence, 50); // Generate 50 notes
  console.log('Generated Sequence:', generated);

  await saveMidiFile(generated, 'dist/output-weighed.mid');
  console.log('MIDI file saved!');
}

run();
