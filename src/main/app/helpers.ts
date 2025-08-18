import { CLOCKS_PER_BEAT, DEFAULT_BEAT_PER_BAR } from "../constants";
import { NoteEvent } from "../types";

export function getNotesPerBar(notes: NoteEvent[], beatsPerBar: number): number[] {
  const barLength = beatsPerBar * CLOCKS_PER_BEAT;
  const notesPerBar: number[] = [];
  let currentClock = 0;

  // init
  const maxBars = notes.reduce((sum, e) => sum + e.deltaTime, 0);
  for (let i = 0; i < maxBars; i++) {
    notesPerBar[i] = 0;
  }

  notes.forEach((note) => {
    currentClock += note.deltaTime;
    const bar = Math.floor(currentClock / barLength);
    notesPerBar[bar]++;
  });
  return notesPerBar;
}

export function splitNotesPerBar(notes: NoteEvent[], startBar: number, endBar?: number, beatsPerBar?: number): NoteEvent[] {
  const barLength = (beatsPerBar !== undefined ? beatsPerBar : DEFAULT_BEAT_PER_BAR) * CLOCKS_PER_BEAT;
  const notesPerBar: NoteEvent[][] = [];
  let currentClock = 0;

  const maxBars = notes.reduce((sum, e) => sum + e.deltaTime, 0);
  for (let i = 0; i < maxBars; i++) {
    notesPerBar[i] = [];
  }
  if (startBar < 0) {
    // means it takes from the end
    startBar = maxBars + startBar;
  }
  if (endBar < 0) {
    endBar = maxBars + endBar;
  }
  if (endBar === undefined) {
    endBar = maxBars;
  }
  notes.forEach((note) => {
    currentClock += note.deltaTime;
    const bar = Math.floor(currentClock / barLength);
    notesPerBar[bar].push(note);
  });


  const output = notesPerBar.reduce((total, bar) => total.concat(bar), []);
  // TODO: maybe check if we need to cap duration
  return output;
}
