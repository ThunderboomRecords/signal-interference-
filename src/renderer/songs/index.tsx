import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Song from './song';
import './index.css';
import { GenerationStemData, TrainingData } from 'src/main/types';

const initSong = {
  name: '',
  trainingData: [] as TrainingData[],
  beatsPerBar: 4,
  stemData: [] as GenerationStemData[],
  midiSelection: { cc: 56, value: 0, },
}
export default function Songs() {
  const [song, setSong] = useState(initSong);

  useEffect(() => {
    // get songs
  }, []);
  return (
    <div id='songContainer'>
      <div id='song-labels'>
        <span>Titel</span>
        <span>Midi Input</span>
        <span>Markov Order</span>
        <span>Generatie lengte</span>
        <span>Midi Selectie Command</span>
      </div>
      <div id='songs-container'>
        <Song selected song={song} onChange={(e) => { setSong(e); console.log('changed song', e) }} />
      </div>
      <Button id='addSongButton'>+ Add Song</Button>
    </div >
  )
}
