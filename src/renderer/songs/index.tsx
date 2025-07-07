import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import SongComponent from './song';
import './index.css';
import { GenerationStemData, Song, TrainingData } from 'src/main/types';

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
  activeSong: Song,
  onChange: (songs: Song[]) => void
}) {
  const { songs, selectSong, activeSong, onChange } = props;

  return (
    <>
      {
        songs.map((song, index) => (
          <SongComponent
            key={index}
            song={song}
            selected={activeSong.name === song.name}
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
  const [activeSong, setActiveSong] = useState(initSong);
  const [hasGottenCurrentSongs, setHasGottenCurrentSongs] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    // get songs
    const inputs = window.electronApi.project.getCurrent().then((val) => {
      setSongs(val.songs);
      setHasGottenCurrentSongs(true);
    });
  }, []);
  useEffect(() => {
    // update the current song in the project
    // guard: if we haven't gotten the current songs yet, we don't want to update
    if (!hasGottenCurrentSongs) return;
    window.electronApi.project.update({ songs: songs });
    console.log({ songs });
  }, [songs]);
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
            selectSong={setActiveSong}
            activeSong={activeSong}
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
                onClick={() => {
                  const newSong = { ...initSong };
                  setSongs([...songs, newSong]);
                  setActiveSong(newSong);
                }}
              >+ Add Song</Button>
            </td>
          </tr>
        </tfoot>
      </table >
    </>
  )
}
