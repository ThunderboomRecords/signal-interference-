import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import Song from './song';
import './index.css';

export default function Songs() {

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
        <Song selected song={{
          name: '',
          trainingData: [],
          stemData: [],
          beatsPerBar: 4,
        }} />
      </div>

      <Button id='addSongButton'>+ Add Song</Button>
    </div >
  )
}
