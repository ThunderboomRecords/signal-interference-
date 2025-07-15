import { StaveNote } from 'vexflow';
import { NoteEvent } from 'src/main/types';
import { midiToVexflowKey, ticksToVexflowDuration } from '../../main/helpers';

export function noteEventsToVexflowNotes(noteEvents: NoteEvent[]): StaveNote[] {
  return noteEvents.map(event => {
    const key = midiToVexflowKey(event.note);
    const duration = ticksToVexflowDuration(event.duration);

    return new StaveNote({
      keys: [key],
      duration,
    });
  });
}
