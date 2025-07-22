// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { MidiInterfaceInfo, Project, Song, NoteEvent} from '../main/types';

type MidiInterfaceCallback = (info: MidiInterfaceInfo) => void;

const ipcApi = {
  midiConfiguration: {
    setDawInput: (midiDawInput: string) => ipcRenderer.send('midi:setDawInput', midiDawInput),
    setInputChannel: (midiInput: string) => ipcRenderer.send('midi:setInput', midiInput),
    setOutputChannel: (midiOutput: string) => ipcRenderer.send('midi:setOutput', midiOutput),
    // invoking
    getMidiPorts: () => ipcRenderer.invoke('midi:getPorts'),
    onMidiDawInput: (callback: MidiInterfaceCallback) => {
      return ipcRenderer.on('midi:currentDawInput', (_event, value) => { callback(value); });
    },
    onMidiInput: (callback: MidiInterfaceCallback) => {
      return ipcRenderer.on('midi:currentMidiInput', (_event, value) => { callback(value); });
    },
    onMidiOutput: (callback: MidiInterfaceCallback) => {
      return ipcRenderer.on('midi:currentMidiOutput', (_event, value) => { callback(value); });
    },
    onMidiChange: (callback: (
      midi: {
        daw: MidiInterfaceInfo,
        input: MidiInterfaceInfo,
        output: MidiInterfaceInfo,
      }) => void) => ipcRenderer.on(
        'midi:onUpdate',
        (_event, midi) => callback(midi)
      ),
  },
  sequencer: {
    record: () => ipcRenderer.invoke('sequencer:record'),
    stopRecording: () => ipcRenderer.invoke('sequencer:stopRecording'),
    onRecordingStatus: (callback: (status: boolean) => void) => ipcRenderer.on(
      'sequencer:recordingStatus',
      (_event, status) => callback(status)
    ),
    startPlayback: () => ipcRenderer.invoke('sequencer:startPlayback'),
    stopPlayback: () => ipcRenderer.invoke('sequencer:stopPlayback'),

    onPlaybackStatus: (callback: (status: boolean) => void) => ipcRenderer.on(
      'sequencer:playbackStatus',
      (_event, status) => callback(status)
    ),
    generate: () => ipcRenderer.invoke('sequencer:generate'),
    onClock: (callback: (currentTime: number) => void) => ipcRenderer.on(
      'sequencer:playbackClock',
      (_event, cTime) => callback(cTime)
    )
  },

  // set
  updateSetting: (key: string, value: string) => { return ipcRenderer.invoke('setting:update', key, value); },
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  // receiving

  project: {
    getCurrent: () => ipcRenderer.invoke('project:getCurrent'),
    update: (project: Partial<Project>) => ipcRenderer.invoke('project:update', project),
    load: (path: string) => ipcRenderer.invoke('project:load', path),
    save: (path: string) => ipcRenderer.invoke('project:save', path),
    addNewsong: () => ipcRenderer.invoke('project:newSong'),
    selectSong: (song: Partial<Song>) => ipcRenderer.invoke('project:selectSong', song),
    deleteSong: (song: Partial<Song>) => ipcRenderer.invoke('project:deleteSong', song),
    onProjectChange: (callback: (project: Project) => void) => ipcRenderer.on(
      'project:onUpdate',
      (_event, project) => callback(project)
    ),
  },
  // Added sheetmusic in the renderer
  sheetMusic: {
    onRender: (callback: (notes: NoteEvent[]) => void) => {
      ipcRenderer.on('sheet:render', (_event, notes: NoteEvent[]) => {
        callback(notes);
      });
    }
  }
}

contextBridge.exposeInMainWorld('electronApi', ipcApi);

export type ElectonAPI = typeof ipcApi;
