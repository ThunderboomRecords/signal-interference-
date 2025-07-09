import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import SongComponent from './song';
import './index.css';
import { GenerationStemData, Song, TrainingData } from 'src/main/types';
import { Project } from 'src/main/app/project';

const initSong: Song = {
  name: '',
  trainingData: [] as TrainingData[],
  beatsPerBar: 4,
  stemData: [] as GenerationStemData[],
  midiSelection: { cc: 56, value: 0, },
  generationOptions: {
    order: 12,
    length: 12,
  }
}

function RenderSongs(props: {
  songs: Song[],
  selectSong: (song: Song) => void,
  activeSongId: string,
  onChange: (songs: Song[]) => void
}) {
  const { songs, selectSong, activeSongId, onChange } = props;

  return (
    <>
      {
        songs.map((song, index) => (
          <SongComponent
            key={index}
            song={song}
            selected={activeSongId === song.id}
            onSelect={() => selectSong(song)}
            onChange={(e) => {
              const newSongs = [...songs];
              newSongs[index] = { ...newSongs[index], ...e };
              onChange(newSongs);
            }}
          />
        ))
      }
    </>
  );
}
export default function Songs() {
  const [activeSong, setActiveSong] = useState<string | undefined>(undefined);
  const [hasGottenCurrentSongs, setHasGottenCurrentSongs] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  const setSong = (song: Song) => {
    window.electronApi.project.selectSong(song);
    setActiveSong(song.id);
  }
  useEffect(() => {
    // get songs
    const inputs = window.electronApi.project.getCurrent().then((val: Project) => {
      setSongs(val.songs);
      setHasGottenCurrentSongs(true);
      if (val.activeSongId) {
        setActiveSong(val.activeSongId);
      } else if (val.songs.length > 0) {
        setSong(val.songs[0]);
      }
      console.log({ project: val });
    });
  }, []);
  useEffect(() => {
    // update the current song in the project
    // guard: if we haven't gotten the current songs yet, we don't want to update
    if (!hasGottenCurrentSongs) return;
    window.electronApi.project.update({ songs: songs });
    console.log({ songs });
  }, [songs]);

  useEffect(() => {
    // set active song to the first song if none are selected
    if (!activeSong && songs.length > 0) {
      setSong(songs[0]);
      console.log('activeSongs', activeSong);
    }
  }, [activeSong])
  return (
    <>
      <table id='songContainer'>
        <thead id='song-labels'>
          <tr>
            <td>Titel</td>
            <td>Midi Input</td>
            <td>Markov Order</td>
            <td>Generatie lengte</td>
            <td>Midi Selectie Command</td>
          </tr>
        </thead>
        <tbody id='songs-container'>
          <RenderSongs
            songs={songs}
            selectSong={(song) => {
              setSong(song)
            }}
            activeSongId={activeSong}
            onChange={(songs) => {
              setSongs(songs);
            }}
          />
        </tbody>
        <tfoot>
          <tr>
            <td>
              <Button
                id='addSongButton'
                onClick={async () => {
                  const newProject = await window.electronApi.project.addNewsong();
                  console.log({ newProject });
                  setSongs(newProject.songs);
                  setActiveSong(newProject.songs.slice(-1));
                }}
              >+ Add Song</Button>
            </td>
          </tr>
        </tfoot>
      </table >
    </>
  )
}
