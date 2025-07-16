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

