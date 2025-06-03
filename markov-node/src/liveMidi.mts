import midi from 'midi';
import type { NoteEvent } from './types.mts';
import HigherOrderMarkovChain from './markov.mts';
import { parseMidiFile, saveMidiFile } from './midiFileIO.mts';
import promptSync from 'prompt-sync';

const prompt = promptSync();

// MIDI Clock Constants
const CLOCKS_PER_BEAT = 24; // MIDI clock sends 24 pulses per quarter note
const BEATS_PER_BAR = 4;
const CLOCKS_PER_BAR = CLOCKS_PER_BEAT * BEATS_PER_BAR;
const TARGET_BARS = 12;
const TARGET_CLOCKS = CLOCKS_PER_BAR * TARGET_BARS;

// State for Recording
let clockCount = 0;
let beatTimes: number[] = []; // Array of elapsed times per beat
let recording: boolean = true;
let playing: boolean = false;
let startTime: [number, number] | null = null;
let noteOnEvents: { [note: number]: number } = {}; // note -> timestamp
let recordedEvents: NoteEvent[] = [];
let lastBeatTime: [number, number] | null = null;
let liveOutputChannel = 1;
let liveSchedule: ScheduledNote[] = [];
let liveTickCount = 0;
// Setup MIDI Input
const clockInput = new midi.Input(); // also DAW input
const noteInput = new midi.Input();
const outputPort = new midi.Output();

function secondsToTicks(seconds: number, bpm: number): number {
  const ticksPerSecond = (bpm * 24) / 60;
  return Math.round(seconds * ticksPerSecond);
}
type ScheduledNote = {
  midi: number;
  startTick: number;
  endTick: number;
};

function prepareSchedule(events: NoteEvent[], bpm: number, outputChannel: number): ScheduledNote[] {
  const schedule: ScheduledNote[] = [];
  let accumulatedTicks = 0;

  for (const event of events) {
    const deltaTicks = secondsToTicks(event.deltaTime, bpm);
    const durationTicks = secondsToTicks(event.duration, bpm);

    accumulatedTicks += deltaTicks;

    schedule.push({
      midi: event.note,
      startTick: accumulatedTicks,
      endTick: accumulatedTicks + durationTicks,
    });
  }

  return schedule;
}

function sendNoteOn(note: number, channel: number) {
  console.log('note on', channel, note);
  outputPort.sendMessage([0x90 + channel, note, 100]); // Velocity 100
}

function sendNoteOff(note: number, channel: number) {
  outputPort.sendMessage([0x80 + channel, note, 0]);
}

function calculateBPM(): number | null {
  if (beatTimes.length < 3) {
    return null; // Not enough data
  }
  const avgBeatTime = beatTimes.reduce((sum, t) => sum + t, 0) / beatTimes.length;
  return 60 / avgBeatTime;
}

clockInput.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message;

  if (status === 0xF8) {
    // MIDI Clock Tick
    if (recording) {
      clockCount++;
      if (clockCount % 24 === 0) { // Every beat (24 clocks)
        const now = process.hrtime();
        if (lastBeatTime) {
          const elapsed = (now[0] - lastBeatTime[0]) + (now[1] - lastBeatTime[1]) / 1e9;
          beatTimes.push(elapsed);
          if (beatTimes.length > 10) {
            beatTimes.shift(); // Keep last 10 beat durations
          }
        }
        lastBeatTime = now;
        const bpm = calculateBPM();
        if (bpm) {
          process.stdout.write(`\rCurrent BPM: ${bpm.toFixed(2)}   `); // overwrite line
        }
      }

      if (clockCount >= TARGET_CLOCKS) {
        recording = false;
        console.log('Recording finished, generating new MIDI file...');
        generateFromRecording();
        playing = true;
      }
    }
    if (playing) {
      // Playback mode
      liveTickCount++;
      console.log('live tick count', liveTickCount);

      // Send scheduled note ons
      for (const note of liveSchedule) {
        if (note.startTick === liveTickCount) {
          sendNoteOn(note.midi, liveOutputChannel);
        }
        if (note.endTick === liveTickCount) {
          sendNoteOff(note.midi, liveOutputChannel);
        }
      }
    }
  } else if (status == 0xFA) {
    console.log('\nStart received: starting recording...');
    startRecording();
  } else if (status == 0xFC) {
    // Stop Button
    console.log('\nStop received: stopping recording...');
    recording = false;
    generateFromRecording();
  }

});

noteInput.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message;

  if (status >= 0x90 && status < 0xA0 && data2 > 0) {
    // Note On
    if (recording) {
      if (!startTime) {
        startTime = process.hrtime(); // High resolution time
      }
      const currentTime = process.hrtime(startTime);
      const timestamp = currentTime[0] + currentTime[1] / 1e9;

      noteOnEvents[data1] = timestamp;
    }
  } else if ((status >= 0x80 && status < 0x90) || (status >= 0x90 && data2 === 0)) {
    // Note Off
    if (recording) {
      const currentTime = process.hrtime(startTime!);
      const timestamp = currentTime[0] + currentTime[1] / 1e9;

      const note = data1;
      if (noteOnEvents[note] !== undefined) {
        const deltaTime = noteOnEvents[note]; // When it started
        const duration = timestamp - deltaTime; // How long it was held

        let relativeDeltaTime = recordedEvents.length === 0
          ? deltaTime
          : deltaTime - recordedEvents.reduce((sum, e) => sum + e.deltaTime, 0);

        recordedEvents.push({
          note,
          deltaTime: relativeDeltaTime,
          duration,
        });

        delete noteOnEvents[note];
      }
    }
  }
});
function startRecording() {
  // Reset everything
  clockCount = 0;
  beatTimes = [];
  lastBeatTime = null;
  startTime = null;
  noteOnEvents = {};
  recordedEvents = [];
  recording = true;
}

console.log('Waiting for MIDI clock and Start message... 🎶');

async function generateFromRecording() {
  if (recordedEvents.length < 10) {
    console.error('Not enough events recorded.');
    process.exit(1);
  }
  const bpm = calculateBPM();
  if (!bpm) {
    console.error('Not enough BPM data.');
    process.exit(1);
  }
  console.log(`Detected BPM: ${bpm.toFixed(2)}`);

  const order = 12;
  const notes = await parseMidiFile('assets/midi/solo.mid');
  console.log('Parsed Notes:', notes);
  const chain = new HigherOrderMarkovChain<NoteEvent>(order);
  chain.addSequence(notes);

  const startSequence = recordedEvents.slice(recordedEvents.length - order, recordedEvents.length);

  const barsToGenerate = 24;
  const generated = chain.generateBarsFuzzy(startSequence, barsToGenerate, bpm);
  const outputChannel = 1;
  liveSchedule = prepareSchedule(generated, bpm, outputChannel);
  liveOutputChannel = outputChannel; // store the channel
  console.log(liveSchedule);
  liveTickCount = 0;

  const outputFilePath = 'generated_output_live.mid';
  saveMidiFile(generated, outputFilePath).then(() => {
    console.log(`Generated MIDI saved to ${outputFilePath}`);
    //clockInput.closePort();
    //noteInput.closePort();
    //process.exit(0);
  });
}


// List all MIDI Input devices
function listMidiInputs() {
  const input = new midi.Input();
  const count = input.getPortCount();
  const ports: string[] = [];

  console.log('Available MIDI Input Devices:');
  for (let i = 0; i < count; i++) {
    const name = input.getPortName(i);
    ports.push(name);
    console.log(`${i}: ${name}`);
  }
  return ports;
}
function selectMidiInputs() {
  const ports = listMidiInputs();
  const clockPortInput = prompt('Select MIDI Clock input port: ');
  if (!clockPortInput) {
    console.error('invalid MIDI clock input port. Exiting');
    process.exit(1);
  }
  const notePortInput = prompt('Select MIDI Notes input port: ');
  if (!notePortInput) {
    console.error('invalid MIDI note input port. Exiting');
    process.exit(1);
  }
  const notePortOutput = prompt('Select MIDI Notes output port: ');
  if (!notePortOutput) {
    console.error('invalid MIDI note output port. Exiting');
    process.exit(1);
  }
  const clockPort = parseInt(clockPortInput);
  const notePort = parseInt(notePortInput);
  const noteOutPort = parseInt(notePortOutput);

  if (isNaN(clockPort) || clockPort < 0 || clockPort >= ports.length) {
    console.error('Invalid Clock input port.');
    process.exit(1);
  }

  if (isNaN(notePort) || notePort < 0 || notePort >= ports.length) {
    console.error('Invalid Note input port.');
    process.exit(1);
  }
  if (isNaN(noteOutPort) || noteOutPort < 0 || noteOutPort >= ports.length) {
    console.error('Invalid Note input port.');
    process.exit(1);
  }

  clockInput.openPort(clockPort);
  noteInput.openPort(notePort);
  outputPort.openPort(noteOutPort);

  clockInput.ignoreTypes(false, false, false);
  noteInput.ignoreTypes(false, false, false);
}

// MAIN
function main() {
  selectMidiInputs();
  console.log('Waiting for MIDI clock Start message... 🎶');
}

main();
