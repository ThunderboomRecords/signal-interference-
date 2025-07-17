import { StaveNote } from 'vexflow';
import { NoteEvent } from '../types'; // adjust the path as needed
import { midiToVexflowKey, ticksToVexflowDuration } from '../helpers'; // your existing helpers

export function noteEventsToVexflowNotes(noteEvents: NoteEvent[]): StaveNote[] {
  return noteEvents.map(event => {
    const key = midiToVexflowKey(event.note);        // e.g. "c/4"
    const duration = ticksToVexflowDuration(event.duration); // e.g. "q"

    return new StaveNote({
      keys: [key],
      duration,
    });
  });
}

const notes: NoteEvent[] = [
    { note: 60, deltaTime: 0, duration: 96 },
    { note: 62, deltaTime: 96, duration: 48 },
    { note: 64, deltaTime: 144, duration: 24 },
  ];
  
  const vexNotes = noteEventsToVexflowNotes(notes);
  console.log(vexNotes)