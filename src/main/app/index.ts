import Sequencer from "../midi/sequencer";
import { midiPorts } from "../midi/io";
import { NoteEvent } from "../types";

const sequencer = new Sequencer(midiPorts.getClockPort(), midiPorts.getInputPort(), midiPorts.getOutputPort());

let recordedNotes: NoteEvent[] = [];

// NOTE: got stuck here with the application
export function stopRecording() {
  sequencer.stopRecording();
}
function recordingCallback(notes: NoteEvent[]) {

}
export function startRecording(bars: number) {
  sequencer.startRecording(bars, recordingCallback);
}
