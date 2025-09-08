// various project related helpers
import { CLOCK_PER_BEAT_RESOLUTION, DEFAULT_BEAT_PER_BAR, MAX_HISTORY_LENGTH } from "../constants";
import { NoteEvent, Song, ScoredNote } from "../types";

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

//New helper function to find the best timing offset

export function findBestTimingOffsetNearDownbeats(
  sequence: NoteEvent[],
  beatsPerBar = DEFAULT_BEAT_PER_BAR,
  maxOffsetRange = 48
): {
  bestOffset: number;
  bestScore: number;
  shiftedSequence: NoteEvent[];
} {
  const ticksPerBar = beatsPerBar * CLOCK_PER_BEAT_RESOLUTION;

  // Step 1: Build absolute time
  let currentTick = 0;
  const notesWithTime = sequence.map((note) => {
    currentTick += note.deltaTime;
    return {
      ...note,
      absoluteTime: currentTick,
    };
  });

  // Step 2: Filter to only the best-aligned note near each beat 1
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
            tickOffset: tickOffset,
            offset: 0, // will be set during scoring
            distanceToBeat: 0, // will be set during scoring
            duration: note.duration ?? 0, // ← optional chaining fallback
            score: 0,
          };
        }
      }
    }
  }

  const filteredNotes = Object.values(bestPerDownbeat);

  // Step 3: Score each offset in range [-48, +48]
  const allScores: { offset: number; average: number }[] = [];
  for (let offset = -maxOffsetRange; offset <= maxOffsetRange; offset++) {
    let totalScore = 0;

    for (const note of filteredNotes) {
      const shifted = note.tickOffset + offset;
      const wrapped = ((shifted % CLOCK_PER_BEAT_RESOLUTION) + CLOCK_PER_BEAT_RESOLUTION) % CLOCK_PER_BEAT_RESOLUTION;
      const distance = Math.min(wrapped, CLOCK_PER_BEAT_RESOLUTION - wrapped);
      const score = 10 * (1 - distance / maxOffsetRange);
      totalScore += score;
    }

    const average = filteredNotes.length ? totalScore / filteredNotes.length : 0;
    allScores.push({ offset, average });
  }

  allScores.sort((a, b) => b.average - a.average);
  const best = allScores[0];

  // Step 4: Apply best offset
  const shiftedNotes: NoteEvent[] = [];
  let previousTime = 0;
  for (const note of notesWithTime) {
    const shiftedTime = note.absoluteTime + best.offset;
    const deltaTime = shiftedTime - previousTime;
    shiftedNotes.push({
      note: note.note,
      deltaTime,
      duration: note.duration ?? CLOCK_PER_BEAT_RESOLUTION, // fallback
    });
    previousTime = shiftedTime;
  }

  // Step 5: Log
  console.log("\n🎯 Best offset:", best.offset, `(Avg score: ${best.average.toFixed(2)})`);
  console.log("Idx\tNote\tBar.Beat\t+TickOffset\tScore");
  filteredNotes.forEach((n, i) => {
    const score = 10 * (1 - Math.abs(n.tickOffset + best.offset) / maxOffsetRange);
    console.log(
      `${i}\t${n.note}\t${n.bar + 1}.${n.beat + 1}\t+${n.tickOffset}\t\t${score.toFixed(2)}`
    );
  });

  return {
    bestOffset: best.offset,
    bestScore: best.average,
    shiftedSequence: shiftedNotes,
  };
}


