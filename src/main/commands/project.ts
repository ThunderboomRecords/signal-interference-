import { ipcMain, ipcRenderer } from 'electron';
import { addNewsong, getCurrentProject, loadProject, saveProject, setActiveSong, updateProject } from "../app/project";
import { Project, Song } from '../types';

export default function init() {
  ipcMain.handle('project:getCurrent', (_event) => {
    return getCurrentProject();
  });
  ipcMain.handle('project:update', (_event, project: Partial<Project>) => {
    console.log('updating project', project);
    updateProject(project);
  });
  ipcMain.handle('project:load', (_event, path: string) => {
    return loadProject(path);
  });
  ipcMain.handle('project:save', (_event, path: string) => {
    return saveProject(path);
  });
  ipcMain.handle('project:newSong', (_event) => {
    const newSong = addNewsong();
    return newSong;
  });
  ipcMain.handle('project:selectSong', (_event, song: Song) => {
    setActiveSong(song.id);
    return song;
  });
}
