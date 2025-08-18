import Midi from 'midi'
import { NoteEvent } from '../types';
import { CLOCKS_PER_BEAT, CLOCK_PER_BEAT_RESOLUTION } from '../constants';
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
export type PlayingClockCallback = (clock: number) => void;
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
    startRecordingTick: number;
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
  playbackClockCallback: PlayingClockCallback | undefined;
  stopPlayingOnBeat: number;
  noteOnPlayingEvents: Map<number, number>;
  outputChannel: number;
  defaultVelocity: number;

  // Control messages
  ccCallbacks: { [command: number]: CCCallback };
  ccEventsBuffer: Map<number, number>;

  constructor(dawInput: Midi.Input, recordingInput: Midi.Input, output: Midi.Output) {
    // this.dawInput = dawInput;
    // this.recordingInput = recordingInput;
    // this.noteOutput = output;
    // this.registerRecordingCallback();
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
      startRecordingTick: -1,
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
    this.recording.startRecordingTime = Date.now();
    this.recording.startRecordingTick = this.clockCount;
    this.recording.noteOnEvents = {};
    this.recording.recordedEvents = [];
    this.recording.stopRecordingCallback = callback;
    this.recording.isRecording = true;
  }
  notesFromTimeToTicks(notes: NoteEvent[]) {
    let bpm = this.bpm;
    if (bpm > 300 || bpm < 30) {
      console.error('got wrong bpm values');
      bpm = 120;
    }
    // converts to format of 96 ticks per quarter note
    const secondInMs = 1000;
    const minuteInSeconds = 60;
    const conversionValue = (secondInMs / (bpm / minuteInSeconds)) / CLOCK_PER_BEAT_RESOLUTION;
    const orderedNotes = notes.sort((a, b) => a.deltaTime - b.deltaTime);
    const convertedResults = orderedNotes.map((noteEvent, index) => {
      const deltaTime = index > 0 ? noteEvent.deltaTime - orderedNotes[index - 1].deltaTime : noteEvent.deltaTime;
      return {
        deltaTime: Math.round(deltaTime / conversionValue),
        duration: Math.round(noteEvent.duration / conversionValue),
        note: noteEvent.note,
      }
    });
    return convertedResults;
  }
  stopRecording() {
    this.recording.stopRecordingOnBeat = -1;
    this.recording.isRecording = false;

    // transform recording events to ticks
    if (this.recording.stopRecordingCallback) {
      this.recording.stopRecordingCallback(this.notesFromTimeToTicks(this.recording.recordedEvents));
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
    // const currentTime = this.clockCount - this.recording.startRecordingTime;
    const currentTimeMs = Date.now() - this.recording.startRecordingTime;
    this.recording.noteOnEvents[note] = currentTimeMs;
  }
  private recordNoteOff(note: number) {
    // check if we have received a note on for this note
    if (!this.recording.noteOnEvents[note]) {
      return;
    }
    // const currentTime = this.clockCount - this.recording.startRecordingTick;
    const currentTimeMs = Date.now() - this.recording.startRecordingTime;
    const deltaTime = this.recording.noteOnEvents[note];
    const duration = currentTimeMs - deltaTime;
    this.recording.recordedEvents.push({
      note,
      deltaTime: currentTimeMs,
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
  setPlaybackClockCallback(callback: PlayingClockCallback) {
    this.playbackClockCallback = callback;
  }
  startPlayback(events: NoteEvent[], callback?: PlayingCallback) {
    this.stopPlaybackCallback = callback;
    let accumulatedTicks = 0;
    let endTime = 0;
    const clockConversionValue = CLOCKS_PER_BEAT / CLOCK_PER_BEAT_RESOLUTION;
    this.playbackEvents = []; // reset playback events
    events.forEach((event) => {
      accumulatedTicks += event.deltaTime;
      const endTick = accumulatedTicks + event.duration;
      if (endTick > endTime) {
        endTime = endTick
      }
      this.playbackEvents.push({
        note: event.note,
        startTick: Math.round(accumulatedTicks * clockConversionValue),
        endTick: Math.round(endTick * clockConversionValue),
      });
    });
    console.log({ notes: this.playbackEvents });
    const numberOfBarsToPlay = (endTime - this.playbackEvents[0].startTick / CLOCKS_PER_BEAT) / 4;
    console.log({ start: this.playbackEvents[0], end: this.playbackEvents.slice(-1)[0], numberOfBarsToPlay });

    this.startPlayingTime = this.clockCount;
    this.stopPlayingOnBeat = endTime * clockConversionValue + this.clockCount;
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

    if (this.playbackClockCallback) {
      this.playbackClockCallback(currentTime);
    }
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
      // console.log('BPM: ', this.bpm);
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
