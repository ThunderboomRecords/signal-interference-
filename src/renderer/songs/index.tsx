import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import SongComponent from './song';
import './index.css';
import { GenerationStemData, Song, TrainingData } from 'src/main/types';
import { addNewsong, Project } from 'src/main/app/project';
import useProject from '../lib/projectHook';

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
  const { project,
    updateProject,
    addSong,
    updateSongs,
    deleteSong,
    selectSong
  } = useProject();
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
            songs={project?.songs || []}
            selectSong={selectSong}
            activeSongId={project?.activeSongId}
            onChange={(songs) => {
              updateSongs(songs);
            }}
          />
        </tbody>
        <tfoot>
          <tr>
            <td>
              <Button
                id='addSongButton'
                onClick={async () => {
                  addSong();
                }}
              >+ Add Song</Button>
            </td>
          </tr>
        </tfoot>
      </table >
    </>
  )
}
