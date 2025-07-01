import { debounce } from "src/helpers";
import { NoteEvent, Song } from "src/main/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Trash2 } from "lucide-react";


function FileUpload(props: {
  trainingFiles?: string[],
  onFileSelect: (files: { name: string, notes: NoteEvent[] }[]) => void,
}) {
  const { trainingFiles, onFileSelect } = props;
  const hasTrainingFiles = trainingFiles?.length > 0;
  return (
    <span className="file-button">
      <Button
        onClick={(e) => {
          e.preventDefault();
          window.electronApi.openFileDialog().then((
            dialogOutput: {
              canceled: boolean,
              files: string[],
              midiFiles: { name: string, filePath: string, notes: NoteEvent[] }[]
            }) => {
            const { canceled, files } = dialogOutput;
            if (canceled) return;
            console.log({ dialogOutput });
            const output = dialogOutput.midiFiles.map((file) => ({
              name: file.name,
              notes: file.notes
            }));
            onFileSelect(output);
          });
        }}
      >
        File upload
      </Button>
      {
        hasTrainingFiles && <span>{trainingFiles[0]}</span>
      }
    </span>
  )
}

function DeleteButton(props: { onClick: () => void }) {
  const { onClick } = props;
  // TODO add an are you sure delete button dialog
  return (
    <Button onClick={onClick}>
      <Trash2 />
    </Button>
  )
}


export default function SongBar(props: {
  song: Song,
  selected: boolean,
  onSelect?: (song: Song) => void,
  onChange?: (song: Song) => void,
  onDelete?: (song: Song) => void,
}) {
  const { song, selected, onSelect, onChange } = props;
  const trainingFileNames = song.trainingData.map((fileName) => fileName.name.split(/[\\/]/).slice(-1)[0]);

  return (
    <tr onClick={() => { onSelect(song) }} className={`song-container ${selected && 'selected'}`}>
      <td>
        <Input onInput={(e) => {
          console.log(e.target.value);
          const newSongInfo = { ...song };
          newSongInfo.name = e.target.value;
          onChange(newSongInfo);
        }}
          type='text'
          placeholder="Naam"
          defaultValue={song.name}
        />
      </td>
      <td>
        <FileUpload trainingFiles={trainingFileNames} onFileSelect={(files) => {
          const newSongInfo = { ...song };
          newSongInfo.trainingData = files;
          onChange(newSongInfo);
        }} />
      </td>
      <td>
        <Input min="1" max="1000" type='number' placeholder="Markov Order" defaultValue={12}
          onChange={(e) => {
            console.log(e.target.value);
            const newSongInfo = { ...song };
            newSongInfo.generationOptions.order = parseInt(e.target.value);
            if (typeof newSongInfo.generationOptions.order !== 'number' || isNaN(newSongInfo.generationOptions.order)) {
              return;
            }
            onChange(newSongInfo);
          }}
        />

      </td>
      <td>
        <Input
          type='number'
          placeholder="Bars to generate"
          defaultValue={12}
          min="1"
          max="1000"
          onChange={(e) => {
            console.log(e.target.value);
            const newSongInfo = { ...song };
            newSongInfo.generationOptions.length = parseInt(e.target.value);
            if (typeof newSongInfo.generationOptions.length !== 'number' || isNaN(newSongInfo.generationOptions.length)) {
              return;
            }
            onChange(newSongInfo);
          }}
        />

      </td>
      <td>
        <Input
          type='number'
          placeholder="Song selection"
          min="0"
          max="127"
          onChange={(e) => {
            console.log(e.target.value);
            const newSongInfo = { ...song };
            newSongInfo.midiSelection.value = parseInt(e.target.value);
            if (typeof newSongInfo.midiSelection.value !== 'number' || isNaN(newSongInfo.midiSelection.value)) {
              return;
            }
            onChange(newSongInfo);
          }}
        />

      </td>
      <td>
        <DeleteButton onClick={() => { console.log('should delete') }} />
      </td>
    </tr>
  )
}
