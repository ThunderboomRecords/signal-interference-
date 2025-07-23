import { ipcMain, ipcRenderer } from 'electron';
import { stripProjectForRenderer } from '../app';
import { addNewsong, deleteSong, getCurrentProject, loadProject, saveProject, setActiveSong, updateProject } from "../app/project";
import { Project, Song } from '../types';

export default function init() {
  ipcMain.handle('project:getCurrent', (_event) => {
    return stripProjectForRenderer(getCurrentProject());
  });
  ipcMain.handle('project:update', (_event, project: Partial<Project>) => {
    return updateProject(project).then(async (proj) => { return stripProjectForRenderer(proj); });
  });
  ipcMain.handle('project:load', (_event, path: string) => {
    return loadProject(path);
  });
  ipcMain.handle('project:save', (_event, path: string) => {
    return saveProject(path);
  });
  ipcMain.handle('project:newSong', (_event) => {
    const proj = addNewsong();
    return proj.then(async (proj) => { return stripProjectForRenderer(proj); });
  });
  ipcMain.handle('project:deleteSong', (_event, song: Partial<Song>) => {
    return deleteSong(song);
  });
  ipcMain.handle('project:selectSong', (_event, song: Song) => {
    return setActiveSong(song.id);
  });
}
