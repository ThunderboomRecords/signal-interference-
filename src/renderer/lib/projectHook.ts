import { Project, Song, NoteEvent, GenerationOptions } from "src/main/types";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "../../utils/debounce";
import { Underline } from "lucide-react";

export default function useProject() {
  const [project, setProject] = useState<Project | undefined>(undefined);
  const debouncedSetProject = useCallback(debounce(setProject, 20), [setProject]);
  useEffect(() => {
    // get songs
    window.electronApi.project.getCurrent().then((val: Project) => {
      setProject(val);
    });
    window.electronApi.project.onProjectChange((proj) => {
      console.log('project change', { proj });
      // FIXME: double check partial updates and make a better mechanism for this. Now seems to break sometimes
      debouncedSetProject((project) => ({ ...project, ...proj }));
    });
  }, []);
  useEffect(() => {
    // console.log({ project });
  }, [project]);

  const addSong = () => {
    window.electronApi.project.addNewsong().then((proj) => {
      setProject(proj);
    });
  }

  const updateSongsMain = useCallback(debounce((songs: Song[]) => {
    window.electronApi.project.update({ songs: songs }).then((proj) => {
      setProject(proj);
    });
  }, 200), [setProject]);
  const updateSongs = (songs: Song[]) => {
    setProject((e) => ({ ...e, songs: [...songs] }));
    updateSongsMain(songs);
  }
  const updateProject = (project: Partial<Project>) => {
    window.electronApi.project.update(project).then((proj) => {
      console.log('updating project', proj)
      setProject(proj);
    });
  }
  const deleteSong = (song: Partial<Song>) => {
    window.electronApi.project.deleteSong(song).then((proj) => {
      setProject(proj);
    });
  }

  const selectSongMain = useCallback(debounce((song: Partial<Song>) => {
    window.electronApi.project.selectSong(song);
  }, 200), [setProject]);
  const selectSong = (song: Partial<Song>) => {
    console.log('switched', song.id);
    setProject((e) => ({ ...e, activeSongId: song.id }));
    selectSongMain(song);
  }

  const activeSong = project?.songs?.filter((e) => e.id === project.activeSongId)?.[0] || undefined;
  //const latestGeneratedNotes = activeSong?.history?.slice(-1)?.[0].output?.slice(-1)?.[0].notes;
  const latestGeneratedNotes = activeSong?.history?.at(-1)?.output?.at(-1)?.notes;
  const barsGenerated = activeSong?.generationOptions.barsToGenerate;
  const generationOptions = activeSong?.generationOptions;

  return {
    project,
    updateProject,
    addSong,
    updateSongs,
    deleteSong,
    selectSong,
    activeSong,
    latestGeneratedNotes,
    barsGenerated,
    generationOptions,
  }
}
