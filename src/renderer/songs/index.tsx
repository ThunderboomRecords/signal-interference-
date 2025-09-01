import { Button } from '../components/ui/button';
import SongComponent from './song';
import './index.css';
import { Song, } from '../..//main/types';
import useProject from '../hooks/projectHook';

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
            index={index}
          />
        ))
      }
    </>
  );
}
export default function Songs() {
  const { project,
    addSong,
    deleteSong,
    selectSong,
    updateSong,
  } = useProject();
  return (
    <>
      <div id="item-header">
        ALL SONGS
      </div>
      <div id='outerContainer'>
        <table id='songContainer'>
          <thead id='song-labels'>
            <tr id='information'>
              <td>#</td>
              <td>Song Title</td>
              <td>Midi Input File</td>
              <td>Markov Order</td>
              <td>Generation Length</td>
              <td>Midi Selection Message</td>
              <td>Delete</td>
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
        </table >
      </div>
      <div id='bottom-button'>
        <Button
          id='addSongButton'
          onClick={async () => {
            addSong();
          }}
        >+ Add New Song</Button>
      </div>
    </>
  )
}
