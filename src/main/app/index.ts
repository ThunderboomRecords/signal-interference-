// Main application logic. Maintains project state and updates the renderer accordingly.
import Sequencer from "../midi/sequencer";
import { getMidiPortNumberByName, midiPorts } from "../midi/io";
import { ApplicationSettings, NoteEvent, Project, Song } from "../types";
import HigherOrderMarkovChain from "../markov";
import { saveMidiFile } from "../midi/fileIO";
import * as path from 'path'
import { app, BrowserWindow, dialog } from "electron";
import fs from 'fs/promises';
import { DEFAULT_BEAT_PER_BAR, MAX_OFFSET_RANGE, MAX_HISTORY_LENGTH, SETTINGS_FILENAME } from "../constants";
import { createProject, getCurrentProject, getCurrentSong, loadProject, saveProject, setSongChangeCallback, updateSongInProject } from "./project";
import * as ProjectState from './project';
import { addNewGeneratedData, findBestTimingOffsetNearDownbeats, getLatestGeneratedOutput, getLatestRecording } from "../helpers";
import StopWatch from "../..//utils/stopwatch";

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
export function stripProjectForRenderer(project: Partial<Project>) {
  const strippedProject = { ...project };
  strippedProject.songs = strippedProject.songs.map((entry) => {
    delete entry.markovData;
    return entry;
  });
  return strippedProject;
}


function sendProjectUpdateToRenderer() {
  const currentProject = getCurrentProject();
  mainWindow.webContents.send('project:onUpdate', stripProjectForRenderer(currentProject));
}


export async function updateProject(project: Partial<Project | Project>) {
  const proj = await ProjectState.updateProject(project);
  sendProjectUpdateToRenderer();
  return proj;
}
export async function addNewSong() {
  const proj = await ProjectState.addNewsong();
  sendProjectUpdateToRenderer();
  return proj;
}

export async function setActiveSong(id: string): Promise<Partial<Project>> {
  const currentSong = getCurrentSong();
  if (id === currentSong.id) {
    return;
  }
  const proj = await ProjectState.setActiveSong(id);

  sendProjectUpdateToRenderer();
  return proj;
}

export async function newProject() {
  createProject();
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
function onPlaybackClock(currentClock: number) {
  mainWindow.webContents.send('sequencer:playbackClock', currentClock);
}
export function startPlayback() {
  const currentSong = getCurrentSong();
  const generatedOutput = getLatestGeneratedOutput(currentSong);
  if (!generatedOutput) {
    console.log('nothing to playback');
    return;
  }
  sequencer.startPlayback([...generatedOutput], stopPlaybackCallback);
  mainWindow?.webContents.send('sequencer:playbackStatus', true);
  sequencer.setPlaybackClockCallback(onPlaybackClock);
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
      currentSong.generationOptions = { order: DEFAULT_MAX_ORDER, barsToGenerate: amountOfBars };
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

  // check for timing offset here
  const proj = getCurrentProject();
  const offsetMode = proj.offsetMode;
  if (offsetMode !== "off") {
    const { bestOffset, bestScore, shiftedSequence } = findBestTimingOffsetNearDownbeats(generatedOutput, DEFAULT_BEAT_PER_BAR, MAX_OFFSET_RANGE, offsetMode);
    console.log(
      `Applied timing offset (${offsetMode}) of ${bestOffset} ticks (lowest score: ${bestScore})`
    );
    generatedOutput = shiftedSequence;  
  } else {
    console.log("Offset mode OFF — no timing correction applied.");
  }

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

interface SwitchSongState {
  setActiveSongPromise?: Promise<void>,
  updateSongInProjectPromise?: Promise<Partial<Song>>
  mostRecentSongNumber?: number,
}
const switchSongState: SwitchSongState = {
  setActiveSongPromise: undefined,
  updateSongInProjectPromise: undefined,
  mostRecentSongNumber: undefined,
}
// Note can take a while to complete resulting in race conditions sometimes
async function switchSong(value: number) {
  const totalTime = new StopWatch();
  const proj = getCurrentProject();
  const song = proj.songs.find((song) => song.midiSelection.value === value);
  if (song) {
    switchSongState.mostRecentSongNumber = value;
    await setActiveSong(song.id);
    if (switchSongState.mostRecentSongNumber !== value) {
      return;
    }
    const songRes = onSongChange(song, song);
    if (switchSongState.mostRecentSongNumber !== value) {
      return;
    }
    if (songRes === switchSongState.mostRecentSongNumber) {
      await updateSongInProject({ ...song, ...songRes });
    }
    if (switchSongState.mostRecentSongNumber !== value) {
      return;
    }
    sendProjectUpdateToRenderer();
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
  sequencer.setCCCallback(33, () => { stopRecording(); });
  sequencer.setCCCallback(40, (_cc, data) => { generate(data) });
  // TODO: 41 for selecting generative base for now defaults to recorded thing
  sequencer.setCCCallback(48, () => { startPlayback(); })
  sequencer.setCCCallback(49, () => { stopPlayback(); })
  sequencer.setCCCallback(56, (_cc, data) => { switchSong(data); })
}

export function init(window: BrowserWindow) {
  registerCallbacks();
  registerMainWindow(window);
  setSongChangeCallback(onSongChange);
}

export function setDawInput(port: string) {
  const dawNo = getMidiPortNumberByName(port, 'input');
  if (dawNo === -1) {
    console.error('could noto find', port);
    return;
  }
  midiPorts.setDawPort(port);
  sequencer.setDawInput(midiPorts.getDawPort());
  mainWindow?.webContents.send('midi:currentDawInput', { name: port, index: dawNo });
  return port;
}
export function setRecordingInput(port: string) {
  const dawNo = getMidiPortNumberByName(port, 'input');
  if (dawNo === -1) {
    console.error('could noto find', port);
    return;
  }
  midiPorts.setInputPort(port);
  sequencer.setRecordingInput(midiPorts.getInputPort());
  mainWindow?.webContents.send('midi:currentMidiInput', { name: port, index: dawNo });
  return port;
}
export function setMidiOutput(port: string) {
  const dawNo = getMidiPortNumberByName(port, 'input');
  if (dawNo === -1) {
    console.error('could noto find', port);
    return;
  }
  midiPorts.setOutputPort(port);
  sequencer.setOutput(midiPorts.getOutputPort());
  mainWindow?.webContents.send('midi:currentMidiOutput', { name: port, index: dawNo });
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
  dawInput: (dawInput: string) => {
    const dawNo = getMidiPortNumberByName(dawInput, 'input');
    if (dawNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setDawInput(dawInput);
  },

  midiInput: (midiInput: string) => {
    const midiInputNo = getMidiPortNumberByName(midiInput, 'input');
    if (midiInputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setRecordingInput(midiInput);
  },

  midiOutput: (midiOutput: string) => {
    const midiOutputNo = getMidiPortNumberByName(midiOutput, 'input');
    if (midiOutputNo < 0) {
      // no input could be found
      return;
    }
    // update clock
    setMidiOutput(midiOutput);
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

function isApplicationSettingsKey(key: keyof ApplicationSettings): boolean {
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
export async function saveHistoryOfCurrentSongWithDialog() {

  const currentSong = getCurrentSong();
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: `Save history of ${currentSong.name}`,
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  });
  if (canceled) return;
  if (currentSong.history.length === 0) return;
  const saveFilePromises = currentSong.history.map((hist, i) => {
    const fileName = `${filePath}-${i}-${hist.input.timestamp}.mid`;
    return saveMidiFile(hist.input.notes, fileName);
  });
  return Promise.all(saveFilePromises);
}
