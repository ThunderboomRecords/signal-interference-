import ToneJS, { Midi } from '@tonejs/midi';
import { Note } from '@tonejs/midi/dist/Note';
const { Midi } = ToneJS;
import * as fs from 'fs';
import { CLOCKS_PER_BEAT } from '../constants';
import type { NoteEvent } from './types';


function convertToClockTicks(ppqTicks: number, ppq: number) {
  const tickMultiplier = CLOCKS_PER_BEAT / ppq;
  return Math.round(ppqTicks * tickMultiplier);
}

function getNoteTickTime(midi: Midi, note: Note) {
  const ppq = midi.header.ppq;
  const tickMultiplier = CLOCKS_PER_BEAT / ppq;
  const ppqTicks = midi.header.secondsToTicks(note.time);
  return Math.round(ppqTicks * tickMultiplier);
}

export async function parseMidiFile(filePath: string): Promise<NoteEvent[]> {
  const input = fs.readFileSync(filePath);
  const midi = new Midi(input);
  const ppq = midi.header.ppq;
  const tickMultiplier = CLOCKS_PER_BEAT / ppq;
  console.log({ ppq, tickMultiplier, tempo: midi.header.tempos });

  const notes = midi.tracks[0].notes;
  const events: NoteEvent[] = [];

  console.log({ notes });
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const previousTime = i > 0 ? getNoteTickTime(midi, notes[i - 1]) : 0;
    const deltaTime = getNoteTickTime(midi, note) - previousTime;

    events.push({
      note: note.midi,
      deltaTime,
      duration: convertToClockTicks(midi.header.secondsToTicks(note.duration), ppq),
    });
  }
  console.log({ events });

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

