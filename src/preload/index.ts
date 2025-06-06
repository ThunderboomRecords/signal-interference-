// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';


contextBridge.exposeInMainWorld('electronApi', {
  setClock: (midiClockId: number) => ipcRenderer.send('midi:setClock', midiClockId),
  setInputChannel: (midiInput: number) => ipcRenderer.send('midi:setInput', midiInput),
  setOutputChannel: (midiOutput: number) => ipcRenderer.send('midi:setOutput', midiOutput),
  getMidiInputs: () => ipcRenderer.invoke('midi:getPorts'),
});


