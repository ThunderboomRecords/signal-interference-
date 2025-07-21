import MediaControls from "./mediaControls";
import MidiSelect from "./midiSelect";

export default function GeneralControls() {
  return (
    <div id="GeneralControls">
      <MediaControls />
      <div id="VerticalLine">
      </div>
      <div id="MidiSelectGroup">
        <MidiSelect />
      </div>
    </div>
  )
}
