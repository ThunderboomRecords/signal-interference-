
// Load, Save and update project and create project
// Active project is always stored in the most recent file
import { app } from 'electron';
import { ACTIVE_PROJECT_APP_DATA_FILENAME, DEFAULT_BEAT_PER_BAR } from '../constants';
import { GenerationOptions, GenerationStemData, NoteHistory, Project as ProjectI, Song as SongI, TrainingData, History } from '../types';
import * as path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getSongFromId } from '../helpers';

export class Song implements SongI {
  name: string;
  id: string;
  trainingData: TrainingData[];
  beatsPerBar: number;
  history?: History[];
  stemData: GenerationStemData[];
  midiSelection: { cc: number; value: number; };
  generationOptions: GenerationOptions;
  constructor(beatsPerBar = DEFAULT_BEAT_PER_BAR) {
    this.trainingData = [];
    this.beatsPerBar = beatsPerBar;
    this.history = [];
    this.stemData = [];
    this.midiSelection = { cc: 56, value: 0 };
    this.generationOptions = { order: 12, barsToGenerate: 12 };
    this.id = crypto.randomUUID();
  }

}


export class Project implements ProjectI {
  songs: SongI[];
  lastSavePath?: string;
  activeSongId?: string;
  recordingLength?: number;
  constructor();
  constructor(project?: Partial<ProjectI | Project>);
  constructor(project?: Partial<ProjectI | Project>) {
    if (project?.songs) {
      this.songs = [...project.songs];
    } else {
      this.songs = [];
    }
    this.lastSavePath = project?.lastSavePath || undefined;
    this.activeSongId = project?.activeSongId || undefined;
    this.recordingLength = project?.recordingLength || 12;
  }
  findSongIndex(song: Song) {
    return this.songs.findIndex((e) => e.id === song.id);
  }
  updateSong(song: Partial<Song>) {
    if (!song.id) {
      console.error('no song id provided, could not update');
      return;
    }
    const index = this.findSongIndex(song as Song);
    if (index < 0) {
      console.error('could not find song to update');
      return;
    }
    this.songs[index] = { ...this.songs[index], ...song };
  }
  deleteSong(song: Partial<Song>) {
    if (!song.id) {
      console.error('no song id provided, could not delete');
      return;
    }
    const index = this.findSongIndex(song as Song);
    if (index < 0) {
      console.error('could not find song to delete');
      return;
    }
    if (this.activeSongId === song.id) {
      // change active song
      if (this.songs.length > 1) {
        const newSelect = this.songs.slice(index - 1)[0];
        this.activeSongId = newSelect.id || undefined;
      } else {
        this.activeSongId = undefined;
      }
    }
    this.songs.splice(index);

  }
}

let currentProject = new Project();

// TODO: add a history of projects

async function updateProjectInAppData(project: ProjectI) {
  const appDataPath = app.getPath('appData');
  console.log({ appDataPath });
  const projectPath = path.join(appDataPath, ACTIVE_PROJECT_APP_DATA_FILENAME);
  const data = JSON.stringify(project, null, 0);
  try {
    await fs.writeFile(projectPath, data);
  } catch (err) {
    console.error('something went wrong while updating the project in cache', err);
  }
}
async function loadProjectInAppData() {
  const appDataPath = app.getPath('appData');
  const projectPath = path.join(appDataPath, ACTIVE_PROJECT_APP_DATA_FILENAME);
  loadProject(projectPath);
}
export function createProject() {
  // should warn before opening a new project (in renderer)
  console.log('creating new project');
  currentProject = new Project();
  updateProjectInAppData(currentProject);
  return currentProject;
}

export async function saveProject(filePath: string) {
  // fault should propagate to UI
  const hasJSONExtension = filePath.split('.').slice(-1)[0].toLowerCase() === 'json';
  if (!hasJSONExtension) {
    filePath = `${filePath}.json`;
  }
  currentProject.lastSavePath = filePath;

  await updateProjectInAppData(currentProject);
  const data = JSON.stringify(currentProject, null, 0);
  await fs.writeFile(filePath, data);
}
export async function loadProject(path: string) {
  // loads as project from a specific path
  // Note should warn in the UI that it will override the current project
  console.log('loading project', path);
  const project = new Project(JSON.parse((await fs.readFile(path)).toString()));
  currentProject = project;
  await updateProjectInAppData(currentProject);
  return project;
}


export async function updateProject(project: Partial<ProjectI>) {
  // can do a partial update
  const updatedProject = new Project({ ...currentProject, ...project });
  currentProject = updatedProject;
  await updateProjectInAppData(currentProject);
  return currentProject;
}
export async function updateSongInProject(song: Partial<Song>) {
  currentProject.updateSong(song);
  const updatedProject = new Project({ ...currentProject });
  await updateProjectInAppData(updatedProject);
}
// basically new project
export function deleteProject() {
  return createProject();
}

export async function addNewsong() {
  const newSong = new Song();
  currentProject.songs.push(newSong);
  currentProject.activeSongId = newSong.id;
  await updateProject(currentProject);
  return currentProject;
}
export async function deleteSong(song: Partial<Song>) {
  currentProject.deleteSong(song);
  await updateProject(currentProject);
  return currentProject;
}
export async function setActiveSong(id: string) {
  currentProject.activeSongId = id;
  await updateProject(currentProject);
  return currentProject;
}

// loads it on boot.
try {
  loadProjectInAppData();
  console.log('loaded project from app data', currentProject);
} catch (err) {
  console.error('could not load project from app data, creating new project', err);
  createProject();
}

export function getCurrentProject(): Project {
  return new Project(currentProject);
}
export function getCurrentSong(): Song | undefined {
  return getSongFromId(currentProject.activeSongId, currentProject.songs);
}
