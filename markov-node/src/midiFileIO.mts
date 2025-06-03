import ToneJS from '@tonejs/midi';
const { Midi } = ToneJS;
import * as fs from 'fs';
import type { NoteEvent } from './types.mts';


export async function parseMidiFile(filePath: string): Promise<NoteEvent[]> {
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

export async function saveMidiFile(events: NoteEvent[], filePath: string) {
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
