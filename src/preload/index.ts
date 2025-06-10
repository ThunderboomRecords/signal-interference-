// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { MidiInterfaceInfo } from '../main/types';


type MidiInterfaceCallback = (info: MidiInterfaceInfo) => void;

contextBridge.exposeInMainWorld('electronApi', {
  // set
  setClock: (midiClockId: number) => ipcRenderer.send('midi:setClock', midiClockId),
  setInputChannel: (midiInput: number) => ipcRenderer.send('midi:setInput', midiInput),
  setOutputChannel: (midiOutput: number) => ipcRenderer.send('midi:setOutput', midiOutput),
  // invoking
  getMidiInputs: () => ipcRenderer.invoke('midi:getPorts'),
  updateSetting: (key: string, value: string) => { return ipcRenderer.invoke('setting:update', key, value); },
  // receiving
  onMidiClock: (callback: MidiInterfaceCallback) => {
    ipcRenderer.on('midi:currentClockInput', (_event, value) => { callback(value); });
  },
  onMidiInput: (callback: MidiInterfaceCallback) => {
    ipcRenderer.on('midi:currentMidiInput', (_event, value) => { callback(value); });
  },
  onMidiOutput: (callback: MidiInterfaceCallback) => {
    ipcRenderer.on('midi:currentMidiOutput', (_event, value) => { callback(value); });
  },
});



