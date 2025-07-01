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
export default function Songs() {
  const [song, setSong] = useState(initSong);

  useEffect(() => {
    // get songs
    const inputs = window.electronApi.project.getCurrent().then((val) => {
      console.log(val);
    });
  }, []);
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
          <SongComponent selected song={song} onChange={(e) => { setSong(e); console.log('changed song', e) }} />
        </tbody>
        <tfoot>
          <tr>
            <td>
              <Button id='addSongButton'>+ Add Song</Button>
            </td>
          </tr>
        </tfoot>
      </table >
    </>
  )
}
