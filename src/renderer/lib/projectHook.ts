import { Project, Song, NoteEvent } from '../../main/types';
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
  if (!song1 && song2) return true;
  if (!song2 && song1) return true;

  for (const key in emptySong) {
    const value1 = JSON.stringify(song1[key as keyof Song]);
    const value2 = JSON.stringify(song2[key as keyof Song]);

    if (value1 !== value2) {
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
    if (key === 'song') {
      // go per song

    }
    const proj1Info = JSON.stringify(proj1[key as keyof Project])
    const proj2Info = JSON.stringify(proj2[key as keyof Project])
    if (proj1Info !== proj2Info) {
      return true;
    }
  }
  return false;

}

function partrialProjectCompare(fullProject: Project | undefined, update: Partial<Project> | undefined) {
  if ((!fullProject && update) || (fullProject && !update)) {
    return true;
  }
  for (const key in update) {
    if (key === 'songs') {
      const changedSongs = getChangedSongs(fullProject.songs, update?.songs);
      if (changedSongs && changedSongs.size > 0) {
        return true;
      }
      continue;
    }
    const fullProjectInfo = JSON.stringify(fullProject[key as keyof Project])
    const updateInfo = JSON.stringify(update[key as keyof Project])
    if (fullProjectInfo !== updateInfo) {
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
    set((state) => {
      if (partrialProjectCompare(state.project, val)) {
        const newProject = { ...state.project, ...val };
        const newState = { ...state };
        newState.project = { ...newProject };
        return newState;
      }
      return state;
    });

    // useProjectStore.getState().setProject(val)
  });
  window.electronApi.project.onProjectChange((proj) => {
    const currentProject = useProjectStore.getState();
    const projectUpdateString = JSON.stringify(proj, null, 2);
    const currentProjectUpdateString = JSON.stringify(currentProject.project, null, 2);
    if (!partrialProjectCompare(currentProject.project, proj)) {
      return;
    }
    set((state) => {
      if (partrialProjectCompare(state.project, proj)) {
        const newProject = { ...state.project, ...proj };
        const newState = { ...state };
        newState.project = { ...newProject };
        return newState;
      }
      return state;
    });
  });


  return {
    project: undefined,
    updateProject: (proj: Partial<Project>) => set((state) => {
      const temp = { ...state.project, ...proj };
      if (partrialProjectCompare(state.project, proj)) {
        const newState = { ...state };
        newState.project = temp;
        window.electronApi.project.update(proj).then((e) => {
          // useProjectStore.getState().setProject(e);
        });
        return newState;
      }
      return state;
    }),
    setProject: (proj: Project) => set((state) => {
      if (partrialProjectCompare(state.project, proj)) {
        const newState = { ...state };
        newState.project = { ...proj };
        window.electronApi.project.update(proj).then(() => {
          // do nothing
        });
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

      window.electronApi.project.addNewsong().then(() => {
        // do nothing for now
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
    deleteSong,
    addSong,
    selectSong,
    updateSongs,
    updateSong,
  } = useProjectStore();

  const activeSong = project?.songs?.find(s => s.id === project.activeSongId);
  const getLatestGeneratedNotes = (): NoteEvent[] => {
    if (!project || !project.activeSongId || !project?.songs) return [];
    if (!activeSong || !activeSong.history?.length) return [];

    const lastHistoryEntry = activeSong.history[activeSong.history.length - 1];
    return lastHistoryEntry?.output?.[0]?.notes ?? [];
  };
  const latestGeneratedNotes = getLatestGeneratedNotes();
  const generationOptions = activeSong?.generationOptions;

  return {
    project,
    updateProject,
    addSong,
    updateSongs,
    deleteSong,
    selectSong,
    getLatestGeneratedNotes,
    updateSong,
    latestGeneratedNotes,
    generationOptions,
  };
}
