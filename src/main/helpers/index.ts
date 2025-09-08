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

export function findBestTimingOffset(
  sequence: NoteEvent[],
  maxOffset = CLOCK_PER_BEAT_RESOLUTION,
  beatsPerBar = DEFAULT_BEAT_PER_BAR
): {
  bestOffset: number;
  bestScore: number;
  shiftedSequence: NoteEvent[];
} {
  const minOffset = -maxOffset;
  const ticksPerBar = beatsPerBar * CLOCK_PER_BEAT_RESOLUTION;

  // Build absolute time from deltaTime
  let currentTime = 0;
  const notesWithTime = sequence.map((note) => {
    currentTime += note.deltaTime;
    return {
      ...note,
      absoluteTime: currentTime,
    };
  });

  // Print the original sequence
  console.log("🎵 Original sequence:");
  console.log("Idx\tNote\tDelta\tTime\tBar.Beat\t+Ticks");
  console.log("--------------------------------------------------");
  notesWithTime.forEach((note, index) => {
    const tickInBar = note.absoluteTime % ticksPerBar;
    const bar = Math.floor(note.absoluteTime / ticksPerBar);
    const beat = Math.floor(tickInBar / CLOCK_PER_BEAT_RESOLUTION);
    const subBeatTicks = tickInBar % CLOCK_PER_BEAT_RESOLUTION;
    console.log(
      `${index}\t${note.note}\t${note.deltaTime}\t${note.absoluteTime}\t${bar + 1}.${beat + 1}\t(+${subBeatTicks})`
    );
  });

  // Scoring helper
  function scoreSequence(offset: number): { average: number; scoredNotes: ScoredNote[] } {
    const scored = notesWithTime.map((note) => {
      const shiftedTime = note.absoluteTime + offset;
      const ticksFromBeat = shiftedTime % CLOCK_PER_BEAT_RESOLUTION;
      const distanceToBeat = Math.min(ticksFromBeat, CLOCK_PER_BEAT_RESOLUTION - ticksFromBeat);
      const score = 1 - distanceToBeat / CLOCK_PER_BEAT_RESOLUTION;

      return {
        note: note.note,
        deltaTime: note.deltaTime,
        duration: note.duration,
        absoluteTime: shiftedTime,
        offset,
        distanceToBeat,
        score,
      };
    });

    const total = scored.reduce((sum, n) => sum + n.score, 0);
    return {
      average: total / scored.length,
      scoredNotes: scored,
    };
  }

  // Try all offsets
  let bestOffset = 0;
  let bestScore = 0;
  let bestScored: ScoredNote[] = [];

  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const { average, scoredNotes } = scoreSequence(offset);
    if (average > bestScore) {
      bestOffset = offset;
      bestScore = average;
      bestScored = scoredNotes;
    }
  }

  // 🖨️ Print best scoring sequence
  console.log(`\n🎯 Best offset found: ${bestOffset} (Avg score: ${bestScore.toFixed(4)})`);
  console.log("Idx\tNote\tDelta\tTime\tBar.Beat\t+Ticks\tOffset\tDist\tScore");
  console.log("----------------------------------------------------------------------");

  let previousTime = 0;
  const shiftedSequence: NoteEvent[] = [];

  bestScored.forEach((n, index) => {
    const tickInBar = n.absoluteTime % ticksPerBar;
    const bar = Math.floor(n.absoluteTime / ticksPerBar);
    const beat = Math.floor(tickInBar / CLOCK_PER_BEAT_RESOLUTION);
    const subBeatTicks = tickInBar % CLOCK_PER_BEAT_RESOLUTION;

    const deltaTime = n.absoluteTime - previousTime;
    shiftedSequence.push({ note: n.note, deltaTime, duration: n.duration, });
    previousTime = n.absoluteTime;

    console.log(
      `${index}\t${n.note}\t${deltaTime}\t${n.absoluteTime}\t${bar + 1}.${beat + 1}\t(+${subBeatTicks})` +
      `\t${n.offset >= 0 ? "+" : ""}${n.offset}\t${n.distanceToBeat}\t${n.score.toFixed(2)}`
    );
  });

  return {
    bestOffset,
    bestScore,
    shiftedSequence,
  };
}

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
            tickOffset,
            score: 0, // placeholder, will be computed later
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


