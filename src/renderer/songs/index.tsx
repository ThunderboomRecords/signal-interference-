import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import SongComponent from './song';
import './index.css';
import { GenerationStemData, Song, TrainingData } from 'src/main/types';
import { addNewsong, Project } from 'src/main/app/project';
import useProject from '../lib/projectHook';
import crypto from 'crypto';

function RenderSongs(props: {
  songs: Song[],
  selectSong: (song: Song) => void,
  activeSongId: string,
  onChange: (songs: Song) => void,
  onDelete: (song: Partial<Song>) => void,
}) {
  const { songs, selectSong, activeSongId, onChange, onDelete } = props;

  return (
    <>
      {
        songs.map((song, index) => (
          <SongComponent
            key={song.id}
            song={song}
            selected={activeSongId === song.id}
            onSelect={() => selectSong(song)}
            onDelete={onDelete}
            onChange={(e) => {
              onChange(e);
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
    selectSong,
    updateSong,
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
              updateSong(songs);
            }}
            onDelete={(song: Partial<Song>) => { deleteSong(song); }}
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
