import { Song } from "src/main/types";
import { Input } from "../components/ui/input";

export default function SongBar(props: { song: Song, selected: boolean }) {

  const { song, selected } = props;
  return (
    <div className={`song-container ${selected && 'selected'}`}>
      <Input type='text' placeholder="Naam" defaultValue={song.name} />
      <Input type='file' placeholder="Trainings Data" defaultValue={song?.trainingData?.[0]?.name} />
      <Input type='number' placeholder="Markov Order" defaultValue={12} />
      <Input type='number' placeholder="Bars to generate" defaultValue={12} />
      <Input type='number' placeholder="Song selection" />
    </div>
  )
}
