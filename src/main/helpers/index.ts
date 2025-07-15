import { Note } from "@tonejs/midi/dist/Note";
import { MAX_HISTORY_LENGTH } from "../constants";
import { NoteEvent, Song } from "../types";
export { StopWatch } from "./stopwatch";

export function getSongFromId(id: string, songs: Song[]) {
  return songs.filter((song) => song.id === id)?.[0] || undefined;
}
export function getLatestGeneratedOutput(song: Song): undefined | NoteEvent[] {
  if (song.history.length === 0) {
    return undefined;
  }
  const history = song.history.slice(-1)[0];
  if (history.output.length === 0) {
    return undefined;
  }
  return history.output.slice(-1)[0].notes;
}
export function getLatestRecording(song: Song): undefined | NoteEvent[] {
  if (song.history.length === 0) {
    return undefined;
  }
  const history = song.history.slice(-1)[0];
  return history.input.notes;
}

export function addNewGeneratedData(song: Song, notes: NoteEvent[]): Song {
  if (!song.history[song.history.length - 1]) {
    // no history present so create one
    song.history.push({
      input: {
        notes: [],
        timestamp: new Date(),
      },
      output: [],
    });
  }
  song.history[song.history.length - 1].output.push({
    timestamp: new Date(),
    notes: [...notes],
  });
  if (song.history[song.history.length - 1].output.length > MAX_HISTORY_LENGTH) {
    song.history[song.history.length - 1].output = song.history[song.history.length - 1].output.slice(-MAX_HISTORY_LENGTH);
  }
  return song;
}

// New functionality: Anticipating on what the AI will play though displaying the g*nerated output in the last bar before the AI will start.

export function midiToVexflowKey(midiNote: number): string {
  const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return `${notes[noteIndex]}/${octave}`;
}

export function ticksToVexflowDuration(ticks: number): string {
  if (ticks >= 192) return 'h';    // half note
  if (ticks >= 144) return 'qd';   // dotted quarter
  if (ticks >= 96)  return 'q';    // quarter
  if (ticks >= 72)  return '8d';   // dotted eighth
  if (ticks >= 48)  return '8';    // eighth
  if (ticks >= 36)  return '16d';  // dotted sixteenth
  if (ticks >= 24)  return '16';   // sixteenth
  if (ticks >= 12)  return '32';   // thirty-second
  return '64';                     // very short fallback
}

