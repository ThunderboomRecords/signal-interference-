import Midi from 'midi'
import { NoteEvent } from '../types';
import { CLOCKS_PER_BEAT } from '../constants';
// MIDI Clock Constants
const MIDI_NOTE_ON_ID = 0x90;
const MIDI_NOTE_OFF_ID = 0x80;
const DEFAULT_CHANNEL = 0;
const DEFAULT_VELOCITY = 100;

function calculateBPM(beatTimes?: number[]): number | undefined {
  if (!beatTimes || beatTimes.length < 3) {
    return undefined; // Not enough data
  }
  const avgBeatTime = beatTimes.reduce((sum, t) => sum + t, 0) / beatTimes.length;
  return 60 / avgBeatTime;
}

export type RecordingCallback = (noteEvents: NoteEvent[]) => void;
export type PlayingCallback = () => void;
export type CCCallback = (controllerCommand: number, data: number) => void;
interface ScheduledNote {
  note: number,
  startTick: number,
  endTick: number,
}
export default class Sequencer {
  // inputs
  clockInput: Midi.Input;
  recordingInput: Midi.Input;
  noteOutput: Midi.Output;
  // beat tracking
  beatTimes: number[];
  lastBeatTime: [number, number] | undefined;
  clockCount: number;
  bpm: number | undefined;
  beatsPerBar: number;

  // recording
  isRecording: boolean;
  startRecordingTime: number;
  noteOnEvents: { [note: number]: number };
  recordedEvents: NoteEvent[];
  stopRecordingOnBeat: number;
  stopRecordingCallback: RecordingCallback | undefined;

  // playback
  isPlaying: boolean;
  startPlayingTime: number;
  playbackEvents: ScheduledNote[];
  stopPlaybackCallback: PlayingCallback | undefined;
  stopPlayingOnBeat: number;
  noteOnPlayingEvents: { [note: number]: number };
  outputChannel: number;
  defaultVelocity: number;

  // Control messages
  ccCallbacks: { [command: number]: CCCallback };

  constructor(clock: Midi.Input, recordingInput: Midi.Input, output: Midi.Output) {
    console.log('creating sequencer');
    this.clockInput = clock;
    this.recordingInput = recordingInput;
    this.noteOutput = output;
    this.beatTimes = [];
    this.clockCount = 0;
    this.bpm = undefined;
    this.beatsPerBar = 4;

    // recording
    this.isRecording = false;
    this.noteOnEvents = {};

    // playback
    this.isPlaying = false;
    this.playbackEvents = [];
    this.stopPlayingOnBeat = -1;
    this.outputChannel = DEFAULT_CHANNEL;
    this.defaultVelocity = DEFAULT_VELOCITY;

    // callbacks
    this.ccCallbacks = {};

    this.setRecordingInput(recordingInput);
    this.setClockInput(clock);
    this.setOutput(output);
  }
  destructor() {
    // TODO: check if it needs to make sense to open and close ports in here.
  }

  setClockInput(clock: Midi.Input) {
    this.clockInput = clock;
    this.clockInput.on('message', (deltaTime: number, message: Midi.MidiMessage) => {
      this.handleClockInput(message);
    });
  }

  setRecordingInput(recordingInput: Midi.Input) {
    this.recordingInput = recordingInput;
    this.recordingInput.on('message', (deltaTime: number, message: Midi.MidiMessage) => {
      this.handleNoteRecordingInput(message);
    });
  }
  setOutput(output: Midi.Output) {
    this.noteOutput = output;
  }
  setBeatsPerBar(beats: number) {
    this.beatsPerBar = beats;
  }

  // CC messages
  setCCCallback(command: number, callback: CCCallback) {
    this.ccCallbacks[command] = callback;
  }

  // recording
  startRecording(bars: number, callback?: RecordingCallback) {
    this.stopRecordingOnBeat = this.clockCount + this.beatsPerBar * bars * CLOCKS_PER_BEAT;
    this.startRecordingTime = this.clockCount;
    this.noteOnEvents = {};
    this.recordedEvents = [];
    this.stopRecordingCallback = callback;
    this.isRecording = true;
    console.log("starting recording", bars);
    console.log({ current: this });

  }
  stopRecording() {
    console.log('stopping recording');
    this.stopRecordingOnBeat = -1;
    this.isRecording = false;
    if (this.stopRecordingCallback) {
      this.stopRecordingCallback([...this.recordedEvents]);
    }

  }
  private handleRecordingClock() {
    console.log({ clock: this.clockCount, beat: this.stopRecordingOnBeat, seq: this });
    if (this.stopRecordingOnBeat && this.stopRecordingOnBeat > 0) {
      // should check if recording needs to be stopped
      if (this.clockCount >= this.stopRecordingOnBeat) {
        // should stop
        this.stopRecording();
      }
    }

  }

  private recordNoteOn(note: number) {
    const currentTime = this.clockCount - this.startRecordingTime;
    this.noteOnEvents[note] = currentTime;
  }
  private recordNoteOff(note: number) {
    // check if we have received a note on for this note
    if (!this.noteOnEvents[note]) {
      return;
    }
    const currentTime = this.clockCount - this.startRecordingTime;
    const deltaTime = this.noteOnEvents[note];
    const duration = currentTime - deltaTime;
    const relativeDeltaTime = this.recordedEvents.length === 0
      ? deltaTime
      : deltaTime - this.recordedEvents.reduce((sum, e) => sum + e.deltaTime, 0);
    this.recordedEvents.push({
      note,
      deltaTime: relativeDeltaTime,
      duration,
    });

    delete this.noteOnEvents[note];

  }
  handleNoteRecordingInput(message: Midi.MidiMessage) {
    const [status, note, velocity] = message;
    const command = status & 0xF0;

    if (command === 0xB0) {
      const [_cmd, cc, data] = message;
      console.log(this.ccCallbacks[cc]);
      console.log(this.ccCallbacks);
      if (this.ccCallbacks[cc]) {
        this.ccCallbacks[cc](cc, data);
      }
    }

    if (!this.isRecording) {
      return
    }
    //const channel = status & 0x0F;
    switch (command) {
      case 0x80:
        // note off
        this.recordNoteOff(note);
        break;
      case 0x90:
        // note On
        if (velocity === 0x00) {
          // treat as note off
          this.recordNoteOff(note);
        } else {
          this.recordNoteOn(note);
        }
        break;
    }
  }


  // Playback
  private noteOff(note: number, channel: number = this.outputChannel) {
    this.noteOutput.sendMessage([MIDI_NOTE_OFF_ID + channel, note, 0]);
  }

  private noteOn(note: number, velocity: number = this.defaultVelocity, channel: number = this.outputChannel) {
    console.log({ note, number, velocity });
    this.noteOutput.sendMessage([MIDI_NOTE_ON_ID + channel, note, 0]);
  }

  startPlayback(events: NoteEvent[], callback?: PlayingCallback) {
    console.log('starting playback');
    this.stopPlaybackCallback = callback;
    let accumulatedTicks = 0;
    events.forEach((event) => {
      accumulatedTicks += event.deltaTime;
      this.playbackEvents.push({
        note: event.note,
        startTick: accumulatedTicks,
        endTick: accumulatedTicks + event.duration,
      });
    });
    this.startPlayingTime = this.clockCount;
  }

  stopPlayback() {
    this.isPlaying = false;
    const noteKeys = Object.keys(this.noteOnPlayingEvents).map(note => parseInt(note, 10));
    noteKeys.forEach((note) => {
      // send note offs for all active notes
      this.noteOff(note);
    });
    if (this.stopPlaybackCallback) {
      this.stopPlaybackCallback();
    }
  }


  private handlePlayback() {
    if (!this.isPlaying) {
      return;
    }
    if (this.stopPlayingOnBeat > 0 && this.clockCount >= this.stopPlayingOnBeat) {
      this.stopPlayback();
    }
    const currentTime = this.clockCount - this.startPlayingTime;
    this.playbackEvents.forEach((event) => {
      if (event.startTick === currentTime) {
        this.noteOn(event.note);
      }
      if (event.endTick === currentTime) {
        this.noteOff(event.note);
      }
    });
  }

  // Clock
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
      this.stopRecordingOnBeat = -1;
    }
  }
  handleClockInput(message: Midi.MidiMessage) {
    const [command, data1, data2] = message;
    switch (command) {
      case 0xF8:
        // midi clock tick
        this.clockCount++;
        if (this.clockCount % CLOCKS_PER_BEAT === 0) {
          console.log(this.clockCount);
        }
        this.handleBPMCalculation();
        this.handleRecordingClock();
        this.handlePlayback();
        break;
    }
  }

}
