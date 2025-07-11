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
  dawInput: Midi.Input;
  recordingInput: Midi.Input;
  noteOutput: Midi.Output;
  // beat tracking
  beatTimes: number[];
  lastBeatTime: [number, number] | undefined;
  clockCount: number;
  bpm: number | undefined;
  beatsPerBar: number;

  // recording
  recording: {
    isRecording: boolean;
    startRecordingTime: number;
    noteOnEvents: { [note: number]: number };
    recordedEvents: NoteEvent[];
    stopRecordingOnBeat: number;
    stopRecordingCallback: RecordingCallback | undefined;
  }

  // playback
  isPlaying: boolean;
  startPlayingTime: number;
  playbackEvents: ScheduledNote[];
  stopPlaybackCallback: PlayingCallback | undefined;
  stopPlayingOnBeat: number;
  noteOnPlayingEvents: Map<number, number>;
  outputChannel: number;
  defaultVelocity: number;

  // Control messages
  ccCallbacks: { [command: number]: CCCallback };
  ccEventsBuffer: Map<number, number>;

  constructor(dawInput: Midi.Input, recordingInput: Midi.Input, output: Midi.Output) {
    this.dawInput = dawInput;
    this.recordingInput = recordingInput;
    this.noteOutput = output;
    this.registerRecordingCallback();
    this.beatTimes = [];
    this.clockCount = 0;
    this.bpm = undefined;
    this.beatsPerBar = 4;
    this.noteOnPlayingEvents = new Map<number, number>();


    // recording
    this.recording = {
      isRecording: false,
      noteOnEvents: {},
      startRecordingTime: -1,
      recordedEvents: [],
      stopRecordingOnBeat: -1,
      stopRecordingCallback: undefined,
    }

    // playback
    this.isPlaying = false;
    this.playbackEvents = [];
    this.stopPlayingOnBeat = -1;
    this.outputChannel = DEFAULT_CHANNEL;
    this.defaultVelocity = DEFAULT_VELOCITY;

    // callbacks
    this.ccCallbacks = {};
    this.ccEventsBuffer = new Map<number, number>();

    this.setRecordingInput(recordingInput);
    this.setDawInput(dawInput);
    this.setOutput(output);
  }
  destructor() {
    // TODO: check if it needs to make sense to open and close ports in here.
  }
  private registerRecordingCallback() {
    console.log('registering callback');
    this.dawInput.on('message', (_deltaTime: number, message: Midi.MidiMessage) => {
      this.handleDawInput(message);
    });
  }

  setDawInput(dawInput: Midi.Input) {
    if (this.dawInput !== dawInput) {
      this.dawInput = dawInput;
      this.registerRecordingCallback();
    }
  }

  setRecordingInput(recordingInput: Midi.Input) {
    if (this.recordingInput !== recordingInput) {
      this.recordingInput = recordingInput;

      this.recordingInput.on('message', (_deltaTime: number, message: Midi.MidiMessage) => {
        this.handleNoteRecordingInput(message);
      });
    }
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
    this.recording.stopRecordingOnBeat = this.clockCount + this.beatsPerBar * bars * CLOCKS_PER_BEAT;
    this.recording.startRecordingTime = this.clockCount;
    this.recording.noteOnEvents = {};
    this.recording.recordedEvents = [];
    this.recording.stopRecordingCallback = callback;
    this.recording.isRecording = true;
  }
  stopRecording() {
    this.recording.stopRecordingOnBeat = -1;
    this.recording.isRecording = false;
    if (this.recording.stopRecordingCallback) {
      this.recording.stopRecordingCallback([...this.recording.recordedEvents]);
    }
    this.ccEventsBuffer = new Map<number, number>();
  }
  private handleRecordingClock() {
    if (this.recording.stopRecordingOnBeat && this.recording.stopRecordingOnBeat > 0) {
      // should check if recording needs to be stopped
      if (this.clockCount >= this.recording.stopRecordingOnBeat) {
        // should stop
        this.stopRecording();
      }
    }

  }

  private recordNoteOn(note: number) {
    const currentTime = this.clockCount - this.recording.startRecordingTime;
    this.recording.noteOnEvents[note] = currentTime;
  }
  private recordNoteOff(note: number) {
    // check if we have received a note on for this note
    if (!this.recording.noteOnEvents[note]) {
      return;
    }
    const currentTime = this.clockCount - this.recording.startRecordingTime;
    const deltaTime = this.recording.noteOnEvents[note];
    const duration = currentTime - deltaTime;
    const relativeDeltaTime = this.recording.recordedEvents.length === 0
      ? deltaTime
      : deltaTime - this.recording.recordedEvents.reduce((sum, e) => sum + e.deltaTime, 0);
    this.recording.recordedEvents.push({
      note,
      deltaTime: relativeDeltaTime,
      duration,
    });

    delete this.recording.noteOnEvents[note];

  }
  handleNoteRecordingInput(message: Midi.MidiMessage) {
    const [status, note, velocity] = message;
    const command = status & 0xF0;


    if (!this.recording.isRecording) {
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
    this.noteOnPlayingEvents.delete(note);
  }

  private noteOn(note: number, velocity: number = this.defaultVelocity, channel: number = this.outputChannel) {
    this.noteOutput.sendMessage([MIDI_NOTE_ON_ID + channel, note, velocity]);
    this.noteOnPlayingEvents.set(note, velocity);
  }

  startPlayback(events: NoteEvent[], callback?: PlayingCallback) {
    this.stopPlaybackCallback = callback;
    let accumulatedTicks = 0;
    let endTime = 0;
    events.forEach((event) => {
      accumulatedTicks += event.deltaTime;
      const endTick = accumulatedTicks + event.duration;
      if (endTick > endTime) {
        endTime = endTick
      }
      this.playbackEvents.push({
        note: event.note,
        startTick: accumulatedTicks,
        endTick,
      });
    });
    console.log({ notes: this.playbackEvents });
    const numberOfBarsToPlay = (endTime - this.playbackEvents[0].startTick / CLOCKS_PER_BEAT) / 4;
    console.log({ start: this.playbackEvents[0], end: this.playbackEvents.slice(-1)[0], numberOfBarsToPlay });

    this.startPlayingTime = this.clockCount;
    this.stopPlayingOnBeat = endTime + this.clockCount;
    this.isPlaying = true;
  }

  stopPlayback() {
    this.isPlaying = false;
    this.noteOnPlayingEvents.forEach((_value, note) => {
      // send note offs for all active notes
      this.noteOff(note);
    });
    this.noteOnPlayingEvents.clear();
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
    }
  }
  handleDawInput(message: Midi.MidiMessage) {
    const [command, cc, data] = message;

    if ((command & 0xF0) === 0xB0) {
      // if (this.ccEventsBuffer.get(cc) === data) {
      //   // only respond to changes
      //   return;
      // }
      this.ccEventsBuffer.set(cc, data);
      if (data > 0 && this.ccCallbacks[cc]) {
        console.log(message);
        this.ccCallbacks[cc](cc, data);
      }
    }
    switch (command) {
      case 0xF8:
        // midi clock tick
        this.clockCount++;
        this.handleBPMCalculation();
        this.handleRecordingClock();
        this.handlePlayback();
        break;
    }
  }

}
