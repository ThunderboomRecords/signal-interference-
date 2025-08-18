import { StaveNote, Accidental } from 'vexflow';
import { NoteEvent, GenerationOptions } from '../..//main/types';
import { midiToVexflowKey, ticksToVexflowDuration } from '../../main/helpers';
export interface HighlighedNote extends NoteEvent {
  shouldHighlighted?: boolean;
}
export function noteEventsToVexflowNotes(noteEvents: HighlighedNote[], startIndex = 0): StaveNote[] {
  return noteEvents.map((event, i) => {
    const key = midiToVexflowKey(event.note);
    const duration = ticksToVexflowDuration(event.duration);

    const noteName = key.split('/')[0];
    const accidental = getAccidentalFromKey(noteName);

    const staveNote = new StaveNote({
      keys: [key],
      duration,
    });

    if (accidental) {
      staveNote.addModifier(new Accidental(accidental), 0);
    }

    // Assign ID to be attached to the rendered SVG element
    staveNote.setAttribute('id', `note-${startIndex + i}`);
    // TODO: add highlight on clock, start time and duration.
    if (event.shouldHighlighted) {
      staveNote.addClass('highlighted');
      staveNote.setStyle({
        fillStyle: 'rgb(69, 56, 245)', strokeStyle: 'rgb(69, 56, 245)',
      })
    }
    return staveNote;
  });
}

function getAccidentalFromKey(noteName: string): string | null {
  if (noteName.includes('#')) return '#';
  if (noteName.includes('b')) return 'b';
  return null;
}

export function getFirstFourBars(noteEvents: NoteEvent[], ticksPerQuarter = 96): NoteEvent[] {
  const maxTicks = ticksPerQuarter * 4 * 4; // 4 bars of 4/4
  let accumulatedTicks = 0;

  const result: NoteEvent[] = [];

  for (const note of noteEvents) {
    accumulatedTicks += note.deltaTime;
    if (accumulatedTicks > maxTicks) break;
    result.push(note);
  }

  return result;
}

export function getFirstNBars(
  noteEvents: NoteEvent[],
  generationOptions: GenerationOptions,
  ticksPerQuarter = 96
): NoteEvent[] {
  if (!noteEvents || noteEvents.length === 0) {
    return [];
  }
  const barsToGenerate = generationOptions?.barsToGenerate ?? 4; // default to 4 if undefined
  const maxTicks = ticksPerQuarter * 4 * barsToGenerate; // 4/4 time assumed
  let accumulatedTicks = 0;

  const result: NoteEvent[] = [];

  noteEvents.forEach((note) => {
    accumulatedTicks += note.deltaTime;
    if (accumulatedTicks > maxTicks) return;
    result.push(note);
  });

  return result;
}
