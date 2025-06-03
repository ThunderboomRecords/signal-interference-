import ToneJS from '@tonejs/midi';
const { Midi, Track } = ToneJS;
import * as fs from 'fs';

type NoteEvent = { note: number; deltaTime: number; duration: number };

class HigherOrderMarkovChain<T> {
  transitions: Map<string, T[]> = new Map();
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
      const next = sequence[i + this.order];

      if (!this.transitions.has(key)) {
        this.transitions.set(key, []);
      }
      this.transitions.get(key)!.push(next);
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

      if (!possibleNext || possibleNext.length === 0) {
        break;
      }

      const next = possibleNext[Math.floor(Math.random() * possibleNext.length)];
      result.push(next);

      // Move the window forward
      current = [...current.slice(1), next];
    }

    return result;
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

  await saveMidiFile(generated, 'dist/output.mid');
  console.log('MIDI file saved!');
}

run();
