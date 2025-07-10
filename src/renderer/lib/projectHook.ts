import { useEffect, useState } from "react";
import { Project, Song } from "src/main/types";

export default function useProject() {
  const [project, setProject] = useState<Project | undefined>(undefined);
  useEffect(() => {
    // get songs
    window.electronApi.project.getCurrent().then((val: Project) => {
      setProject(val);
    });
  }, []);

  const addSong = () => {
    window.electronApi.project.addNewsong().then((proj) => {
      setProject(proj);
    });
  }

  const updateSongs = (songs: Song[]) => {
    window.electronApi.project.update({ songs: songs }).then((proj) => {
      setProject(proj);
    });
  }
  const updateProject = (project: Partial<Project>) => {
    window.electronApi.project.update(project).then((proj) => {
      setProject(proj);
    });
  }
  const deleteSong = (song: Partial<Song>) => {
    window.electronApi.project.deleteSong(song).then((proj) => {
      setProject(proj);
    });
  }
  const selectSong = (song: Partial<Song>) => {
    window.electronApi.project.selectSong(song).then((proj) => {
      setProject(proj);
    });
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
