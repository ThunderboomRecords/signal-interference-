import Sequencer from "../midi/sequencer";
import { getMidiPortNumberByName, midiPorts } from "../midi/io";
import { ApplicationSettings, NoteEvent, Song } from "../types";
import HigherOrderMarkovChain from "../markov/model";
import { parseMidiFile } from "../midi/fileIO";
import * as path from 'path'
import { app, BrowserWindow, dialog } from "electron";
import fs from 'fs/promises';
import { SETTINGS_FILENAME } from "../constants";
import { createProject, getCurrentProject, getCurrentSong, loadProject, saveProject, setActiveSong, updateProject, updateSongInProject } from "./project";
import { addNewGeneratedData, getLatestGeneratedOutput, getLatestRecording, getSongFromId } from "../helpers";
import { createPortal } from "react-dom";
export { loadProject, createProject, saveProject } from './project';

let generatedOutput: NoteEvent[] = [];
const DEFAULT_MAX_ORDER = 12;

const sequencer = new Sequencer(midiPorts.getDawPort(), midiPorts.getInputPort(), midiPorts.getOutputPort());

let recordedNotes: NoteEvent[] = [];

export function stopRecording() {
  sequencer.stopRecording();
  mainWindow.webContents.send('sequencer:recordingStatus', false);
}

function sendProjectUpdateToRenderer() {
  const currentProject = getCurrentProject();
  mainWindow.webContents.send('project:onUpdate', currentProject);
}

export async function newProject() {
  await createProject();
  sendProjectUpdateToRenderer();
}
function recordingCallback(notes: NoteEvent[]) {
  // save current recording 
  if (!notes) {
    console.log(notes);
    return;
  }
  recordedNotes = [...notes];
  console.log('stopped recording', recordedNotes);
  const currentSong = getCurrentSong();
  console.log({ currentSong });

  currentSong.history.push({
    input: { notes: [...notes], timestamp: new Date() },
    output: [],
  });
  console.log('stopped recording', currentSong);
  mainWindow.webContents.send('sequencer:recordingStatus', false);
  updateSongInProject(currentSong);

}
export function startRecording(amountOfBars?: number) {
  const currentSong = getCurrentSong();
  const project = getCurrentProject();
  if (!currentSong) {
    console.error('no song selected for recording');
    return;
  }
  const recordingLength = amountOfBars || project.recordingLength;
  project.recordingLength = recordingLength;
  updateProject(project);
  sequencer.startRecording(recordingLength, recordingCallback);
  mainWindow?.webContents.send('sequencer:recordingStatus', true);
}

function stopPlaybackCallback() {
  mainWindow.webContents.send('sequencer:playbackStatus', false);
}
export function startPlayback() {
  const currentSong = getCurrentSong();
  const generatedOutput = getLatestGeneratedOutput(currentSong);
  if (!generatedOutput) {
    console.log('nothing to playback');
    return;
  }
  console.log('using the following notes for playback', generatedOutput);
  sequencer.startPlayback([...generatedOutput], stopPlaybackCallback);
  mainWindow?.webContents.send('sequencer:playbackStatus', true);
}
export function stopPlayback() {
  sequencer.stopPlayback();
  mainWindow?.webContents.send('sequencer:playbackStatus', false);
}

export function generate(amountOfBars?: number) {
  //const maxOrder = getNotesPerBar(generativeInput, sequencer.beatsPerBar).reduce((max: number, e: number) => (e > max ? e : max), 0);
  console.log('starting to generate');
  const currentSong = getCurrentSong();
  if (amountOfBars !== undefined) {
    currentSong.generationOptions.barsToGenerate = amountOfBars;
    updateSongInProject(currentSong);
  }
  const bars = currentSong.generationOptions.barsToGenerate || 12;
  const latestRecording = getLatestRecording(currentSong) || [];
  const defaultInput = currentSong.trainingData.slice(-1)[0].notes;
  const maxOrder = DEFAULT_MAX_ORDER;

  let startSequence: NoteEvent[] = [];
  if (latestRecording && latestRecording.length >= maxOrder) {
    startSequence = latestRecording.slice(latestRecording.length - maxOrder, latestRecording.length);
  } else {
    startSequence = defaultInput.slice(defaultInput.length - maxOrder, defaultInput.length);
  }
  console.log({
    lengths: {
      generativeInput: latestRecording.length,
      defaultInput: defaultInput.length,
      startSequence: startSequence.length,
    }
  });
  const barsToGenerate = bars;
  const markov: HigherOrderMarkovChain<NoteEvent> = new HigherOrderMarkovChain<NoteEvent>(maxOrder);
  currentSong.trainingData.forEach((data) => {
    markov.addSequence(data.notes);
  })
  const generated = markov.generateBarsFuzzy(startSequence, barsToGenerate, sequencer.beatsPerBar);
  console.log({ generated });
  generatedOutput = [...generated];
  const newSong = addNewGeneratedData(currentSong, generatedOutput);
  updateSongInProject(newSong);
}


async function switchSong(value: number) {
  const proj = getCurrentProject();
  console.log('trying to set song', value);
  const song = proj.songs.find((song) => song.midiSelection.value === value);
  if (song) {
    console.log('setting song', song)
    await setActiveSong(song.id);
    sendProjectUpdateToRenderer();
  } else {
    console.error('could not set song', value);
  }
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
  // FIXME: Panic or kill button
  sequencer.setCCCallback(16, (_cc, data) => { sequencer.setBeatsPerBar(data) });
  sequencer.setCCCallback(31, (_cc, data) => { startRecording(data); });
  // Note 32 does not work for ableton for some reason
  sequencer.setCCCallback(33, (_cc, _data) => { stopRecording(); });
  sequencer.setCCCallback(40, (_cc, data) => { generate(data) });
  // TODO: 41 for selecting generative base for now defaults to recorded thing
  sequencer.setCCCallback(48, (_cc, _data) => { startPlayback(); })
  sequencer.setCCCallback(49, (_cc, _data) => { stopPlayback(); })
  sequencer.setCCCallback(56, (_cc, data) => { switchSong(data); })
}

export function init(window: BrowserWindow) {
  registerCallbacks();
  registerMainWindow(window);
}

export function setDawInput(port: number | string) {
  console.log('setting clock input', port);
  midiPorts.setDawPort(port);
  sequencer.setDawInput(midiPorts.getDawPort());
  return port;
}
export function setRecordingInput(port: number | string) {
  midiPorts.setInputPort(port);
  sequencer.setRecordingInput(midiPorts.getInputPort());
  return port;
}
export function setMidiOutput(port: number | string) {
  midiPorts.setOutputPort(port);
  sequencer.setOutput(midiPorts.getOutputPort());
  return port;
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
  dawInput: (clockInput: string, window: BrowserWindow) => {
    const clockNo = getMidiPortNumberByName(clockInput, 'input');
    if (clockNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setDawInput(clockNo);
    window.webContents.send('midi:midi:currentDawInput', { name: clockInput, index: clockNo });
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
  dawInput: setDawInput,
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
  return newSettings;
}

let mainWindow: undefined | BrowserWindow = undefined;
export function registerMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export async function openProjectWithDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Please open a project',
    filters: [
      {
        extensions: ['json'],
        name: 'json',
      }
    ]
  });

  if (!canceled && filePaths.length > 0) {
    const projectFilePath = filePaths[0];
    const project = await loadProject(projectFilePath);
    sendProjectUpdateToRenderer();
    return project;
  }
  return undefined;
}
export async function saveProjectWithDialog() {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Project',
    defaultPath: 'project.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  saveProject(filePath);
}
