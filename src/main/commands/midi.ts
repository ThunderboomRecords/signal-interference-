import { ipcMain } from 'electron';
import { getMidiIOPorts, midiPorts } from '../midi/io';

// should register all the different functions in here
export function init() {
  ipcMain.handle('midi:getPorts', getMidiIOPorts);
  ipcMain.on('midi:setClock', (_event, port) => { midiPorts.setClockPort(port); });
  ipcMain.on('midi:setInput', (_event, port) => { midiPorts.setInputPort(port); });
  ipcMain.on('midi:setOutput', (_event, port) => { midiPorts.setOutputPort(port); });
}

