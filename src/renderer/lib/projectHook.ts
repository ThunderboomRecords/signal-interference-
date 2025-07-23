import { Project, Song, NoteEvent } from 'src/main/types';
import { useCallback, useEffect, useState } from 'react';
import { debounce } from '../../utils/debounce';
import { create } from 'zustand';

interface ProjectState {
  project: Project | undefined;
  updateProject: (proj: Partial<Project>) => void;
  setProject: (proj: Project) => void;
  deleteSong: (song: Partial<Song>) => void;
  addSong: () => void;
  selectSong: (song: Partial<Song>) => void;
  updateSongs: (songs: Song[]) => void;
  updateSong: (song: Song) => void;
}
const emptyProject: Project = {
  songs: [],
  lastSavePath: '',
  activeSongId: '',
  recordingLength: 0,
};

const emptySong: Song = {
  name: '',
  id: '',
  trainingData: [],
  stemData: [],
  beatsPerBar: 0,
  // stores recorded notes and the notes that are generated from it.
  history: [],
  midiSelection: {
    cc: 0,
    value: 0,
  },
  generationOptions: {
    order: 0,
    barsToGenerate: 0, // bar length
  },
}

function songsAreDifferent(song1: Song, song2: Song) {
  if (song1 === undefined && song2 !== undefined) {
    return true;
  }
  if (song2 === undefined && song1 !== undefined) {
    return true;
  }

  for (const key in emptySong) {
    const song1Info = JSON.stringify(song1[key as keyof Song])
    const song2Info = JSON.stringify(song2[key as keyof Song])
    if (song1Info !== song2Info) {
      return true;
    }
  }
  return false;
}
function getChangedSongs(songs1: Song[], songs2: Song[]) {
  const songIncludes = (songArr: Song[], song: Song) => {
    // first get the same id's
    const foundSoung = songArr.find((s) => s.id === song.id);
    if (!foundSoung) {
      return false;
    }
    if (songsAreDifferent(foundSoung, song)) {
      return false;
    }
    return true;
  }
  // const intersection = arr1.filter(x => arr2.includes(x));
  // const difference = arr1.filter(x => !arr2.includes(x));
  // gotten from: https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
  const symDifference = songs1.filter(x => !songIncludes(songs2, x))
    .concat(songs2.filter(x => !songIncludes(songs1, x)))

  // returns all the id's of the changes songs;
  const idSet = new Set<string>();
  symDifference.forEach((song) => {
    idSet.add(song.id);
  });
  return idSet;
}
function projectsAreDifferent(proj1: Project | undefined, proj2: Project | undefined) {
  if (proj1 === undefined && proj2 !== undefined) {
    return true;
  }
  if (proj2 === undefined && proj1 !== undefined) {
    return true;
  }
  for (const key in emptyProject) {
    const proj1Info = JSON.stringify(proj1[key as keyof Project])
    const proj2Info = JSON.stringify(proj2[key as keyof Project])
    if (proj1Info !== proj2Info) {
      return true;
    }
  }
  return false;
}

// proje,
//   updateProject,
//   addSong,
//   updateSongs,
//   deleteSong,
//   selectSong,
//   getLatestGeneratedNotes,

const useProjectStore = create<ProjectState>()((set) => {


  // get songs
  window.electronApi.project.getCurrent().then((val: Project) => {
    console.log('current project', val);
    useProjectStore.getState().setProject(val)
  });
  window.electronApi.project.onProjectChange((proj) => {
    console.log('project change', { proj });
    // FIXME: double check partial updates and make a better mechanism for this. Now seems to break sometimes
    useProjectStore.getState().setProject(proj)
  });


  return {
    project: undefined,
    updateProject: (proj: Partial<Project>) => set((state) => {
      const temp = { ...state.project, ...proj };
      if (projectsAreDifferent(temp, state.project)) {
        const newState = { ...state };
        newState.project = temp;
        window.electronApi.project.update(proj).then((e) => {
          useProjectStore.getState().setProject(e);
        });
        console.log({ project: state.project })
        return newState;
      }
      return state;
    }),
    setProject: (proj: Project) => set((state) => {
      if (projectsAreDifferent(proj, state.project)) {
        const newState = { ...state };
        newState.project = { ...proj };
        window.electronApi.project.update(proj).then((e) => {
          useProjectStore.getState().setProject(e);
        });
        console.log({ project: state.project })
        return newState;
      }
      return state;
    }),
    deleteSong: (song: Partial<Song>) => set((state) => {
      if (!state.project) return state;
      const newState = { ...state };
      newState.project.songs = state.project.songs.filter((entry) => entry.id !== song.id);
      window.electronApi.project.deleteSong(song).then((proj) => {
        useProjectStore.getState().setProject(proj)
      })
      return newState
    }),
    addSong: () => {
      window.electronApi.project.addNewsong().then((proj) => {
        useProjectStore.getState().updateProject(proj)
      })
    },
    updateSongs: debounce((songs: Song[]) => {
      const state: ProjectState = useProjectStore.getState();
      if (!state.project) return state;

      const changedSongs = getChangedSongs(songs, state?.project?.songs);
      if (changedSongs.size > 0) {
        const newState = { ...state };
        newState.project.songs = [...songs];
        useProjectStore.getState().updateProject(newState.project);
      }
    }, 200),
    selectSong: (song: Partial<Song>) => set((state) => {
      if (!state.project) return state;
      if (state?.project?.activeSongId != song.id) {
        const newState = { ...state };
        newState.project.activeSongId = song.id;
        window.electronApi.project.selectSong(song);
        return newState;
      }
      return state;
    }),
    updateSong: debounce((song: Song) => {
      const state = useProjectStore.getState();
      if (!state.project) return;
      const newState = { ...state.project };
      newState.songs = [...state.project.songs];
      const index = newState.songs.findIndex((s) => s.id === song.id);
      if (index >= 0 && songsAreDifferent(song, newState.songs[index])) {
        newState.songs[index] = { ...newState.songs[index], ...song };
        useProjectStore.getState().updateProject({ ...newState });
      }
    }, 100),
  }
});


export default function useProject() {
  const {
    project,
    updateProject,
    setProject,
    deleteSong,
    addSong,
    selectSong,
    updateSongs,
    updateSong,
  } = useProjectStore();

  const getLatestGeneratedNotes = (): NoteEvent[] => {
    if (!project || !project.activeSongId || !project?.songs) return [];

    const activeSong = project?.songs.find(s => s.id === project.activeSongId);
    if (!activeSong || !activeSong.history?.length) return [];

    const lastHistoryEntry = activeSong.history[activeSong.history.length - 1];
    return lastHistoryEntry?.output?.[0]?.notes ?? [];
  };

  return {
    project,
    updateProject,
    addSong,
    updateSongs,
    deleteSong,
    selectSong,
    getLatestGeneratedNotes,
    updateSong,
  };
}
