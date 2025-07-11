import { ipcMain } from 'electron';
import * as mainApp from '../app'
import { getMidiIOPorts } from '../midi/io';

// should register all the different functions in here
export function init() {
  ipcMain.handle('midi:getPorts', getMidiIOPorts);
  ipcMain.on('midi:setDawInput', (_event, port) => { mainApp.setDawInput(port); });
  ipcMain.on('midi:setInput', (_event, port) => { mainApp.setRecordingInput(port); });
  ipcMain.on('midi:setOutput', (_event, port) => { mainApp.setMidiOutput(port); });
}

