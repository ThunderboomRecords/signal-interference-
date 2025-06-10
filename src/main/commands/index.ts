import { ipcMain } from 'electron';
import { ApplicationSettings } from '../types';
import * as Midi from './midi';
import * as mainApp from '../app'

export default function init() {
  Midi.init();

  ipcMain.handle('setting:update', (_event, key: keyof ApplicationSettings, value: string) => {
    return mainApp.updateSetting(key, value);
  });
}
