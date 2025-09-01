
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
  if (ticks >= 96) return 'q';    // quarter
  if (ticks >= 72) return '8d';   // dotted eighth
  if (ticks >= 48) return '8';    // eighth
  if (ticks >= 36) return '16d';  // dotted sixteenth
  if (ticks >= 24) return '16';   // sixteenth
  if (ticks >= 12) return '32';   // thirty-second
  return '64';                     // very short fallback
}

