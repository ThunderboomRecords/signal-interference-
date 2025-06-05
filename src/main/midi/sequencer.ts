import Midi from 'midi'
// MIDI Clock Constants
const CLOCKS_PER_BEAT = 24; // MIDI clock sends 24 pulses per quarter note
const BEATS_PER_BAR = 4;
const CLOCKS_PER_BAR = CLOCKS_PER_BEAT * BEATS_PER_BAR;
const TARGET_BARS = 12;
const TARGET_CLOCKS = CLOCKS_PER_BAR * TARGET_BARS;

// needs a sequencer which has a clock input, a recording input and an output
//
// const sequencer = new Sequencer(clockInput, recordingInput, )
//
function calculateBPM(beatTimes?: number[]): number | undefined {
  if (!beatTimes || beatTimes.length < 3) {
    return undefined; // Not enough data
  }
  const avgBeatTime = beatTimes.reduce((sum, t) => sum + t, 0) / beatTimes.length;
  return 60 / avgBeatTime;
}

class Sequencer {
  clockInput: Midi.Input;
  recordingInput: Midi.Input;
  noteOutput: Midi.Output;
  beatTimes: number[];
  lastBeatTime: [number, number] | undefined;
  clockCount: number;
  bpm: number | undefined;

  constructor(clock: Midi.Input, recordingInput: Midi.Input, output: Midi.Output) {
    this.clockInput = clock;
    this.recordingInput = recordingInput;
    this.noteOutput = output;
    this.beatTimes = [];
    this.clockCount = 0;
    this.bpm = undefined;
  }

  private handleBPMCalculation() {
    if (this.clockCount % CLOCKS_PER_BEAT === 0) {
      const now = process.hrtime();
      if (this.lastBeatTime) {
        const elapsed = (now[0] - this.lastBeatTime[0]) + (now[1] - this.lastBeatTime[1]) / 1e9;
        this.beatTimes.push(elapsed);
        if (this.beatTimes.length > 10) {
          this.beatTimes.shift(); // Keep last 10 beat durations
        }
      }
      this.lastBeatTime = now;
      this.bpm = calculateBPM(this.beatTimes);
    }
  }
  private handleRecording() {
  }
  private handlePlayback();

  handleClockInput(deltaTime: number, message: Midi.MidiMessage) {
    const [command, data1, data2] = message;
    switch (command) {
      case 0xF8:
        // midi clock tick
        this.clockCount++;
        this.handleBPMCalculation();
        break;
    }
  }

}
