import Sequencer from "../midi/sequencer";
import { getMidiPortNumberByName, midiPorts } from "../midi/io";
import { ApplicationSettings, NoteEvent } from "../types";
import { getNotesPerBar } from "./helpers";
import HigherOrderMarkovChain from "../markov/model";
import { parseMidiFile } from "../midi/fileIO";
import * as path from 'path'
import { defineConfig } from "vite";
import { app, BrowserWindow } from "electron";
import fs from 'fs/promises';
import { SETTINGS_FILENAME } from "../constants";

let generatedOutput: NoteEvent[] = [];
const DEFAULT_MAX_ORDER = 12;

const sequencer = new Sequencer(midiPorts.getClockPort(), midiPorts.getInputPort(), midiPorts.getOutputPort());

let recordedNotes: NoteEvent[] = [];
let generativeInput: NoteEvent[] = [];
const currentModel: HigherOrderMarkovChain<NoteEvent> = new HigherOrderMarkovChain<NoteEvent>(DEFAULT_MAX_ORDER);
let defaultInput: NoteEvent[] = [];

parseMidiFile(path.join(__dirname, '../../assets/trainings_midi/solo.mid')).then((notes) => {
  console.log({ notes });
  currentModel.addSequence([...notes]);
  defaultInput = [...notes];
  console.log({ defaultInput });
});

export function stopRecording() {
  sequencer.stopRecording();
}
function recordingCallback(notes: NoteEvent[]) {
  // save current recording 
  recordedNotes = [...notes];
  generativeInput = [...notes];
}
export function startRecording(bars: number) {
  sequencer.startRecording(bars, recordingCallback);
}

export function startPlayback() {
  sequencer.startPlayback(generativeInput);
}
export function stopPlayback() {
  sequencer.stopPlayback();
}

export function generate(bars: number) {
  //const maxOrder = getNotesPerBar(generativeInput, sequencer.beatsPerBar).reduce((max: number, e: number) => (e > max ? e : max), 0);
  const maxOrder = DEFAULT_MAX_ORDER;

  let startSequence: NoteEvent[] = [];
  if (generativeInput && generativeInput.length > 0) {
    startSequence = generativeInput.slice(generativeInput.length - maxOrder, generativeInput.length);
  } else {
    startSequence = defaultInput.slice(defaultInput.length - maxOrder, defaultInput.length);
  }
  console.log({
    lengths: {
      generativeInput: generativeInput.length,
      defaultInput: defaultInput.length,
      startSequence: startSequence.length,
    }
  });
  const barsToGenerate = bars;
  const generated = currentModel.generateBarsFuzzy(startSequence, barsToGenerate, sequencer.beatsPerBar);
  console.log({ generated });
  generatedOutput = [...generated];
}



function registerCallbacks() {
  // cc messages from 16 to 63 are generally free for custom use.
  // 16: set beats per bar
  // 32: Start recording
  // 33: Stop recording
  // 40: Generate sequence
  // 41: Select generative base
  // 48: Start playback
  // 49: Stop playback
  // 56: Song switching // TODO
  sequencer.setCCCallback(16, (_cc, data) => { sequencer.setBeatsPerBar(data) });
  sequencer.setCCCallback(32, (_cc, data) => { startRecording(data); });
  sequencer.setCCCallback(33, (_cc, _data) => { stopRecording(); });
  sequencer.setCCCallback(40, (_cc, data) => { generate(data) });
  // TODO: 41 for selecting generative base for now defaults to recorded thing
  sequencer.setCCCallback(48, (_cc, _data) => { startPlayback(); })
  sequencer.setCCCallback(49, (_cc, _data) => { stopPlayback(); })
}

export function init() {
  registerCallbacks();
}

export function setClockInput(port: number | string) {
  console.log('setting clock input', port);
  midiPorts.setClockPort(port);
  sequencer.setClockInput(midiPorts.getClockPort());
}
export function setRecordingInput(port: number | string) {
  midiPorts.setInputPort(port);
  sequencer.setRecordingInput(midiPorts.getInputPort());
}
export function setMidiOutput(port: number | string) {
  midiPorts.setOutputPort(port);
  sequencer.setOutput(midiPorts.getOutputPort());
}

export async function loadSettingsFromDisk(): Promise<ApplicationSettings> {
  const appDataPath = app.getPath('appData');
  const settingsPath = path.join(appDataPath, SETTINGS_FILENAME);
  try {
    const settingsString = await fs.readFile(settingsPath);
    const parsedSettings = JSON.parse(settingsString.toString()) as unknown as ApplicationSettings;
    return parsedSettings;
  } catch (err) {
    // does not exist return empty settings
  }
  return {};
}

export async function writeSettingsToDisk(settings: ApplicationSettings) {
  const appDataPath = app.getPath('appData');
  const settingsPath = path.join(appDataPath, SETTINGS_FILENAME);
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}


type settingsCommand = (input: string, window: BrowserWindow) => void;
const settingCommands: { [setting: string]: settingsCommand } = {
  clockInput: (clockInput: string, window: BrowserWindow) => {
    const clockNo = getMidiPortNumberByName(clockInput, 'input');
    if (clockNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setClockInput(clockNo);
    window.webContents.send('midi:currentClockInput', { name: clockInput, index: clockNo });
  },

  midiInput: (midiInput: string, window: BrowserWindow) => {
    const midiInputNo = getMidiPortNumberByName(midiInput, 'input');
    if (midiInputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setRecordingInput(midiInputNo);
    window.webContents.send('midi:currentMidiInput', { name: midiInput, index: midiInputNo });
  },

  midiOutput: (midiOutput: string, window: BrowserWindow) => {
    const midiOutputNo = getMidiPortNumberByName(midiOutput, 'input');
    if (midiOutputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setMidiOutput(midiOutputNo);
    window.webContents.send('midi:currentMidiOutput', { name: midiOutput, index: midiOutputNo });
  }
}



export async function loadSettings(window: BrowserWindow) {
  console.log('loading settings');
  try {
    const settings = await loadSettingsFromDisk();
    console.log('found settings', settings);
    const settingKeys = Object.keys(settings) as (keyof ApplicationSettings)[];
    settingKeys.forEach((key) => {
      // validate input
      if (settings[key] === undefined || typeof settings[key] !== 'string' || settings[key] === '' || !settingCommands[key]) {
        return;
      }
      const settingValue = settings[key];
      settingCommands[key](settingValue, window);
    });
  } catch (err) {
    console.error(err);
  }
}

const updateSettingFunctions: Record<keyof ApplicationSettings, (value: string) => void> = {
  clockInput: setClockInput,
  midiInput: setRecordingInput,
  midiOutput: setMidiOutput,
}
export async function updateSetting(key: keyof ApplicationSettings, value: string) {
  const settings = await loadSettingsFromDisk();
  const newSettings = { ...settings };
  console.log('updating setting', key, value);
  newSettings[key] = value;
  if (updateSettingFunctions[key]) {
    updateSettingFunctions[key](value);
  }
  writeSettingsToDisk(newSettings);
  return newSettings;
}
