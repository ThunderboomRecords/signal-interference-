import { NoteEvent, Song } from "src/main/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@radix-ui/react-dialog"
import { Trash2 } from "lucide-react";
import React, { useState } from "react";


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
            const { canceled } = dialogOutput;
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

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button>
            <Trash2 />
          </Button>
        </DialogTrigger>
        <div className="dialog-wrapper">
          <DialogContent className="sm:max-w-[425px] dialog-content">
            <DialogTitle>Item verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je dit wil verwijderen?
            </DialogDescription>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button onClick={onClick}>Verwijderen</Button>
              <DialogClose asChild>
                <Button>Annuleren</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </div>
      </form>
    </Dialog >
  );
}


export default function SongBar(props: {
  song: Song,
  selected: boolean,
  index: number,
  onSelect?: (song: Song) => void,
  onChange?: (song: Song) => void,
  onDelete?: (song: Partial<Song>) => void,
}) {
  const { song, selected, onSelect, onChange, onDelete } = props;

  const trainingFileNames = song.trainingData.map((fileName) => fileName.name.split(/[\\/]/).slice(-1)[0]);

  const [markovOrder, setMarkovOrder] = useState(song.generationOptions.order);
  const [barsToGenerate, setBarsToGenerate] = useState(song.generationOptions.barsToGenerate);
  const [songSelection, setSongSelection] = useState(song.midiSelection.value);

  return (
    <tr onClick={() => { onSelect(song) }} className={`song-container ${selected && 'selected'}`}>
      <td className="index-input">
        {props.index + 1}
      </td>
      <td>
        <Input className="name-input" onInput={(e) => {
          const newSongInfo = { ...song };
          newSongInfo.name = (e.target as HTMLInputElement).value;
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
        <Input min="1" max="1000" type='number' placeholder="Markov Order" value={markovOrder}
          onChange={(e) => {
            const newMarkovOrder = parseInt(e.target.value);
            if (!isNaN(newMarkovOrder)) {
              setMarkovOrder(newMarkovOrder);
              const newSongInfo = { ...song, generationOptions: { ...song.generationOptions, order: newMarkovOrder } };
              onChange(newSongInfo);
            }
          }}
        />

      </td>
      <td>
        <Input
          type='number'
          placeholder="Bars to generate"
          value={barsToGenerate}
          min="1"
          max="1000"
          onChange={(e) => {
            const newBarsToGenerate = parseInt(e.target.value);
            if (!isNaN(newBarsToGenerate)) {
              setBarsToGenerate(newBarsToGenerate);
              const newSongInfo = { ...song, generationOptions: { ...song.generationOptions, barsToGenerate: newBarsToGenerate } };
              onChange(newSongInfo);
            }
          }}
        />

      </td>
      <td>
        <Input
          type='number'
          placeholder="Song selection"
          value={songSelection}
          min="0"
          max="127"
          onChange={(e) => {
            const newSongSelection = parseInt(e.target.value);
            if (!isNaN(newSongSelection)) {
              setSongSelection(newSongSelection);
              const newSongInfo = { ...song, midiSelection: { ...song.midiSelection, value: newSongSelection } };
              onChange(newSongInfo);
            }
          }}
        />

      </td>
      <td>
        <DeleteButton onClick={() => { onDelete(song) }} />
      </td>
    </tr>
  )
}
