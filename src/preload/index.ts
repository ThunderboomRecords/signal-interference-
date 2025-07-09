// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { MidiInterfaceInfo, Project, Song } from '../main/types';


type MidiInterfaceCallback = (info: MidiInterfaceInfo) => void;

const ipcApi = {
  midiConfiguration: {
    setClock: (midiClockId: number) => ipcRenderer.send('midi:setClock', midiClockId),
    setInputChannel: (midiInput: number) => ipcRenderer.send('midi:setInput', midiInput),
    setOutputChannel: (midiOutput: number) => ipcRenderer.send('midi:setOutput', midiOutput),
    // invoking
    getMidiInputs: () => ipcRenderer.invoke('midi:getPorts'),
    onMidiClock: (callback: MidiInterfaceCallback) => {
      ipcRenderer.on('midi:currentClockInput', (_event, value) => { callback(value); });
    },
    onMidiInput: (callback: MidiInterfaceCallback) => {
      ipcRenderer.on('midi:currentMidiInput', (_event, value) => { callback(value); });
    },
    onMidiOutput: (callback: MidiInterfaceCallback) => {
      ipcRenderer.on('midi:currentMidiOutput', (_event, value) => { callback(value); });
    },
  },
  sequencer: {
    record: () => ipcRenderer.invoke('sequencer:record'),
    stopRecording: () => ipcRenderer.invoke('sequencer:stopRecording'),
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
    selectSong: (song: Song) => ipcRenderer.invoke('project:selectSong', song),
  }

}

contextBridge.exposeInMainWorld('electronApi', ipcApi);


export type ElectonAPI = typeof ipcApi;
