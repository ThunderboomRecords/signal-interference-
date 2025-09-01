// Commands to be used by renderer and the preload script
import { ipcMain } from 'electron';
import * as Midi from './midi';
import * as FileIO from './fileIO';
import * as mainApp from '../app'
import * as Sequencer from './sequencer';
import initProject from './project';

export default function init() {
  Midi.init();
  FileIO.init();
  initProject();
  Sequencer.init();
  ipcMain.handle('setting:update', (_event, key, value) => {
    return mainApp.updateSetting(key, value);
  });
}
