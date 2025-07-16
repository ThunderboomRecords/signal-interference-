import Sequencer from "../midi/sequencer";
import { getMidiPortNumberByName, midiPorts } from "../midi/io";
import { ApplicationSettings, NoteEvent, Project, Song } from "../types";
import HigherOrderMarkovChain from "../markov/model";
import { parseMidiFile } from "../midi/fileIO";
import * as path from 'path'
import { app, BrowserWindow, dialog } from "electron";
import fs from 'fs/promises';
import { MAX_HISTORY_LENGTH, SETTINGS_FILENAME } from "../constants";
import { createProject, getCurrentProject, getCurrentSong, loadProject, saveProject, setActiveSong, setSongChangeCallback, updateProject, updateSongInProject } from "./project";
import { addNewGeneratedData, getLatestGeneratedOutput, getLatestRecording, getSongFromId, StopWatch } from "../helpers";
import { createPortal } from "react-dom";
import { write } from "original-fs";
export { loadProject, createProject, saveProject } from './project';

let generatedOutput: NoteEvent[] = [];
const DEFAULT_MAX_ORDER = 12;
const DEFAULT_BAR_AMOUNT = 12;
let currentMarkovModel: { model: HigherOrderMarkovChain, songId: string } | undefined = undefined;

const sequencer = new Sequencer(midiPorts.getDawPort(), midiPorts.getInputPort(), midiPorts.getOutputPort());

let recordedNotes: NoteEvent[] = [];

export function stopRecording() {
  sequencer.stopRecording();
  mainWindow.webContents.send('sequencer:recordingStatus', false);
}

function sendProjectUpdateToRenderer(project?: Partial<Project>) {
  if (project) {
    console.log('sending update to renderer', project);
    mainWindow.webContents.send('project:onUpdate', project);
  } else {
    console.log('sending full project update to renderer');
    const currentProject = getCurrentProject();
    mainWindow.webContents.send('project:onUpdate', currentProject);
  }
}

export async function newProject() {
  await createProject();
  sendProjectUpdateToRenderer();
}
async function recordingCallback(notes: NoteEvent[]) {
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
  if (currentSong.history.length > MAX_HISTORY_LENGTH) {
    currentSong.history = currentSong.history.slice(-MAX_HISTORY_LENGTH);
  }
  console.log('stopped recording', currentSong);
  mainWindow.webContents.send('sequencer:recordingStatus', false);

  await updateSongInProject(currentSong);
  sendProjectUpdateToRenderer();

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

export async function generate(amountOfBars?: number) {
  //const maxOrder = getNotesPerBar(generativeInput, sequencer.beatsPerBar).reduce((max: number, e: number) => (e > max ? e : max), 0);
  const cTime = Date.now();
  console.log('starting to generate');
  const currentSong = getCurrentSong();
  console.log({ currentSong });
  if (amountOfBars !== undefined) {
    if (!currentSong.generationOptions) {
      currentSong.generationOptions = { order: DEFAULT_MAX_ORDER, barsToGenerate: DEFAULT_BAR_AMOUNT };
    } else {
      currentSong.generationOptions.barsToGenerate = amountOfBars;
    }
    updateSongInProject(currentSong);
  }
  const bars = currentSong?.generationOptions?.barsToGenerate || DEFAULT_BAR_AMOUNT;
  const latestRecording = getLatestRecording(currentSong) || [];
  const defaultInput = currentSong.trainingData.slice(-1)[0].notes;
  const maxOrder = currentSong.generationOptions.order;

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
  if (!currentSong.markovData || currentMarkovModel?.songId !== currentSong.id) {
    console.log('training markov model');
    const trainingStopWatch = new StopWatch();
    currentMarkovModel = {
      model: new HigherOrderMarkovChain(maxOrder),
      songId: currentSong.id,
    }
    currentSong.trainingData.forEach((data) => {
      currentMarkovModel.model.addSequence(data.notes);
    })
    if (!currentSong.markovData) {
      currentSong.markovData = currentMarkovModel.model.export();
      updateSongInProject(currentSong);
    }
    console.log(`Training took: ${trainingStopWatch.stop()}ms`);
  }
  const generationStopWatch = new StopWatch();
  const generated = currentMarkovModel.model.generateBarsFuzzy(startSequence, barsToGenerate, sequencer.beatsPerBar);
  console.log(`Generation took: ${generationStopWatch.stop()}ms`);

  // analyse the markov thins
  generatedOutput = [...generated];
  const endTime = Date.now();
  const deltaTime = endTime - cTime;
  console.log(`generation took: ${deltaTime}ms`);
  const newSong = addNewGeneratedData(currentSong, generatedOutput);
  await updateSongInProject(newSong);
  sendProjectUpdateToRenderer();
}

function isSameTrainingsData(song1: Song, song2: Song) {
  if (song1.trainingData.length !== song2.trainingData.length) {
    return false;
  }
  if (JSON.stringify(song1.trainingData) !== JSON.stringify(song2.trainingData)) {
    return false;
  }
  return true;
}

function onSongChange(oldSong: Song, newSong: Song): Partial<Song> | undefined {
  console.log('song change');
  // guard to prevent training on non existing data
  if (newSong.trainingData.length === 0) {
    return undefined;
  }
  if (!newSong.markovData || !isSameTrainingsData(oldSong, newSong) || currentMarkovModel?.songId !== newSong.id) {
    console.log('updating markov data');
    currentMarkovModel = { model: new HigherOrderMarkovChain(newSong.generationOptions.order), songId: newSong.id };
    newSong.trainingData.forEach((dat) => {
      currentMarkovModel.model.addSequence(dat.notes);
    })
    return ({ markovData: currentMarkovModel.model.export() });

  } else {
    const time = new StopWatch();
    if (!currentMarkovModel) {
      currentMarkovModel = { model: new HigherOrderMarkovChain(newSong.generationOptions.order), songId: newSong.id };
    }
    currentMarkovModel.model.import(newSong.markovData);
    currentMarkovModel.model.setOrder(newSong.generationOptions.order);
    console.log(`importing took: ${time.stop()}`);
  }
  return undefined;
}

async function switchSong(value: number) {
  const totalTime = new StopWatch();
  const proj = getCurrentProject();
  const song = proj.songs.find((song) => song.midiSelection.value === value);
  if (song) {
    await setActiveSong(song.id);
    const songRes = onSongChange(song, song);
    if (songRes) {
      await updateSongInProject({ ...song, ...songRes });
    }
    sendProjectUpdateToRenderer({ activeSongId: songRes.id });
    // setup markov stuff
  } else {
    console.error('could not set song', value);
  }
  console.log('swichSong() totalTime', totalTime.stop());
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
  setSongChangeCallback(onSongChange);
}

export function setDawInput(port: string) {
  midiPorts.setDawPort(port);
  sequencer.setDawInput(midiPorts.getDawPort());
  return port;
}
export function setRecordingInput(port: string) {
  midiPorts.setInputPort(port);
  sequencer.setRecordingInput(midiPorts.getInputPort());
  return port;
}
export function setMidiOutput(port: string) {
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
  dawInput: (dawInput: string, window: BrowserWindow) => {
    const dawNo = getMidiPortNumberByName(dawInput, 'input');
    if (dawNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setDawInput(dawInput);
    window.webContents.send('midi:currentDawInput', { name: dawInput, index: dawNo });
  },

  midiInput: (midiInput: string, window: BrowserWindow) => {
    const midiInputNo = getMidiPortNumberByName(midiInput, 'input');
    if (midiInputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setRecordingInput(midiInput);
    window.webContents.send('midi:currentMidiInput', { name: midiInput, index: midiInputNo });
  },

  midiOutput: (midiOutput: string, window: BrowserWindow) => {
    const midiOutputNo = getMidiPortNumberByName(midiOutput, 'input');
    if (midiOutputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setMidiOutput(midiOutput);
    window.webContents.send('midi:currentMidiOutput', { name: midiOutput, index: midiOutputNo });
  }
}



export async function loadSettings(window: BrowserWindow) {
  try {
    const settings = await loadSettingsFromDisk();
    console.log('loaded settings', settings);
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

function isApplicationSettingsKey(key: any): boolean {
  const keys: (keyof ApplicationSettings)[] = ['dawInput', 'midiInput', 'midiOutput'];
  if (typeof key !== 'string') {
    return false;
  }
  if (keys.find((e) => e === key)) {
    return true;
  }
  return false;
}

export async function updateSetting(key: keyof ApplicationSettings, value: string) {
  const settings = await loadSettingsFromDisk();
  const newSettings: ApplicationSettings = {};


  Object.keys(settings).forEach((key: keyof ApplicationSettings) => {
    if (isApplicationSettingsKey(key)) {
      newSettings[key] = settings[key];
    }
  });

  if (!isApplicationSettingsKey(key)) {
    console.error('not a settings key');
    return settings;
  }
  newSettings[key] = value;
  if (updateSettingFunctions[key]) {
    updateSettingFunctions[key](value);
  }
  writeSettingsToDisk(newSettings);
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
