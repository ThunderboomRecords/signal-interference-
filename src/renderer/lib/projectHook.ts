import { useCallback, useEffect, useState } from "react";
import { Project, Song } from "src/main/types";
import { debounce } from "../../utils/debounce";

export default function useProject() {
  const [project, setProject] = useState<Project | undefined>(undefined);
  useEffect(() => {
    // get songs
    window.electronApi.project.getCurrent().then((val: Project) => {
      setProject(val);
    });
    window.electronApi.project.onProjectChange((proj) => {
      console.log('project change', { proj });
      setProject(proj);
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


  return {
    project,
    updateProject,
    addSong,
    updateSongs,
    deleteSong,
    selectSong,
  }
}
