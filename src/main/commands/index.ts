import { ipcMain } from 'electron';
import { ApplicationSettings } from '../types';
import * as Midi from './midi';
import * as FileIO from './fileIO';
import * as mainApp from '../app'
import initProject from './project';

export default function init() {
  Midi.init();
  FileIO.init();

  initProject();
  ipcMain.handle('setting:update', (_event, key, value) => {
    return mainApp.updateSetting(key, value);
  });
}
