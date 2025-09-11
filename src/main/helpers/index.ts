// various project related helpers
import { CLOCK_PER_BEAT_RESOLUTION, DEFAULT_BEAT_PER_BAR, MAX_HISTORY_LENGTH } from "../constants";
import { NoteEvent, Song } from "../types";

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

/* New improved version of the code */
const MAX_OFFSET_RANGE = 48;

interface ScoredNote extends NoteEvent {
  absoluteTime: number;
  offset: number;
  distanceToBeat: number;
  tickOffset: number;
  score: number;
  bar?: number;
  beat?: number;
}

interface Offset {
  bestOffset: number;
  bestScore: number;
  shiftedSequence: NoteEvent[];
}

function getAbsoluteTimeNotes(sequence: NoteEvent[]): Array<NoteEvent & { absoluteTime: number }> {
  let currentTick = 0;
  return sequence.map((note) => {
    currentTick += note.deltaTime;
    return { ...note, absoluteTime: currentTick };
  });
}

function filterBestAligneDownbeatNotes (notesWithTime: Array<NoteEvent & { absoluteTime: number }>, beatsPerBar: number, maxOffsetRange: number): ScoredNote[] {
  const ticksPerBar = beatsPerBar * CLOCK_PER_BEAT_RESOLUTION;
  const bestPerDownbeat: Record<string, ScoredNote> = {};

  for (const note of notesWithTime) {
    const bar = Math.floor(note.absoluteTime / ticksPerBar);
    const tickInBar = note.absoluteTime % ticksPerBar;

    for (let beat = 0; beat < beatsPerBar; beat++) {
      const downbeatTick = beat * CLOCK_PER_BEAT_RESOLUTION;
      const tickOffset = tickInBar - downbeatTick;

      if (tickOffset >= -maxOffsetRange && tickOffset <= maxOffsetRange) {
        const key = `${bar}.${beat}`;
        const distance = Math.abs(tickOffset);

        if (
          !bestPerDownbeat[key] ||
          Math.abs(bestPerDownbeat[key].tickOffset) > distance
        ) {
          bestPerDownbeat[key] = {
            note: note.note,
            deltaTime: note.deltaTime,
            absoluteTime: note.absoluteTime,
            bar,
            beat,
            tickOffset,
            offset: 0, 
            distanceToBeat: 0, 
            duration: note.duration ?? 0,
            score: 0,
          };
        }
      }
    }
  }
  return Object.values(bestPerDownbeat);
}

function calculateBestOffsetValue(filteredDownbeatNotes: ScoredNote[], maxOffsetRange: number): {bestOffset: number; bestScore: number; allScores: { offset: number; totalDistance: number }[];} {
  const allScores: { offset: number; totalDistance: number }[] = [];

  for (let offset = -maxOffsetRange; offset <= maxOffsetRange; offset++) {
    let totalDistance = 0;
    for (const note of filteredDownbeatNotes) {
      const distance = Math.abs(note.tickOffset + offset);
      totalDistance += distance;
    }
    allScores.push({ offset, totalDistance });
  }

  allScores.sort((a, b) => a.totalDistance - b.totalDistance);
  const best = allScores[0] ?? { offset: 0, totalDistance: 0 };

  const bestScore =
    filteredDownbeatNotes.length > 0
      ? best.totalDistance / filteredDownbeatNotes.length
      : 0;

  return {
    bestOffset: best.offset,
    bestScore,
    allScores,
  };
}

function applyBestOffsetValue (absoluteTimeNotes: Array<NoteEvent & { absoluteTime: number }>, offset: number): NoteEvent[] {
  const shiftedNotes: NoteEvent[] = [];
  let previousTime = 0;

  for (const note of absoluteTimeNotes) {
    const shiftedTime = note.absoluteTime + offset;
    const deltaTime = shiftedTime - previousTime;
    shiftedNotes.push({
      note: note.note,
      deltaTime,
      duration: note.duration,
    });
    previousTime = shiftedTime;
  }
  return shiftedNotes;
}

export function findBestTimingOffsetNearDownbeats(sequence: NoteEvent[], beatsPerBar = DEFAULT_BEAT_PER_BAR, maxOffsetRange = MAX_OFFSET_RANGE): Offset {
  const absoluteTimeNotes = getAbsoluteTimeNotes(sequence);
  const filteredDownbeatNotes = filterBestAligneDownbeatNotes(absoluteTimeNotes, beatsPerBar, maxOffsetRange);
  const { bestOffset, bestScore } = calculateBestOffsetValue(filteredDownbeatNotes, maxOffsetRange);
  const shiftedSequence = applyBestOffsetValue(absoluteTimeNotes, bestOffset);

  return {
    bestOffset,
    bestScore,
    shiftedSequence
  }
}

/* 
  2. Secondly, we can loop over the whole sequence and per loop determine which note is close to the downbeat and calcultate that distance, we should take into account that the filteredDownbeat.length is needed for this.
  TODO: Also create a variable that is set in the front end for switching between the two moduses. 
*/