import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { MidiInterfaceInfo } from "src/main/types";
import './index.css';

function MidiSelector(props: {
  inputList: string[];
  selectCallback: (id: string) => void;
  updateContent: () => void;
  currentInput?: string;
}) {
  const { inputList, selectCallback, updateContent, currentInput } = props;

  const value = (currentInput !== undefined && currentInput !== '') ? currentInput : undefined;
  return (
    <div className="select-wrapper">
      <Select
        value={(currentInput !== undefined && currentInput !== '') && currentInput}
        onOpenChange={() => { updateContent(); }}
        onValueChange={(value: string) => { selectCallback(value) }}>
        <SelectTrigger className="w-[180px]" >
          <SelectValue placeholder="MidiInput" />
        </SelectTrigger>
        <SelectContent >
          {
            inputList.map((inputName: string, index: number) => {
              return (
                <SelectItem key={inputName} value={inputName}>{inputName}</SelectItem>
              )
            })
          }
        </SelectContent>
      </Select >
    </div>
  )
}

function SingleSelector(props: {
  inputList: string[];
  labelName: string;
  selectCallback: (id: string) => void;
  updateContent: () => void;
  currentInput?: string;
}) {
  const { inputList, labelName, selectCallback, updateContent, currentInput } = props;
  return (
    <div className="midi-selector">
      <label>
        {labelName}
      </label>
      <MidiSelector
        inputList={inputList}
        selectCallback={selectCallback}
        updateContent={updateContent}
        currentInput={currentInput}
      />
    </div>

  )

}

// TODO: Add history for this so it remembers the configuration and default io config
export default function MidiSelect() {
  const [midiIO, setMidiIO] = useState<{ input: string[], output: string[] }>({ input: [], output: [] });
  const [currentClockInput, setClockInput] = useState<string | undefined>(undefined);
  const [currentMidiInput, setMidiInput] = useState<string | undefined>(undefined);
  const [currentMidiOutput, setMidiOutput] = useState<string | undefined>(undefined);



  const getContents = async () => {
    const inputs = await window.electronApi.getMidiInputs();
    setMidiIO(inputs);
  }

  useEffect(() => {
    getContents();
    window.electronApi.onMidiInput((value: MidiInterfaceInfo) => {
      setMidiInput(value.name);
    });
    window.electronApi.onMidiOutput((value: MidiInterfaceInfo) => {
      setMidiOutput(value.name);
    });
    window.electronApi.onMidiClock((value: MidiInterfaceInfo) => {
      setClockInput(value.name);
    });
  }, []);

  return (
    <>
      <SingleSelector
        currentInput={currentClockInput}
        inputList={midiIO.input}
        labelName="Clock"
        updateContent={getContents}
        selectCallback={(id) => {
          window.electronApi.updateSetting('clockInput', id).then((e) => {
            setClockInput(e.clockInput);
          });
        }}
      />

      <SingleSelector
        currentInput={currentMidiInput}
        inputList={midiIO.input}
        labelName="Input"
        updateContent={getContents}
        selectCallback={(id) => {
          window.electronApi.updateSetting('midiInput', id).then((e) => {
            setMidiInput(e.midiInput);
          });
        }}
      />

      <SingleSelector
        currentInput={currentMidiOutput}
        inputList={midiIO.output}
        labelName="Output"
        updateContent={getContents}
        selectCallback={(id) => {
          window.electronApi.updateSetting('midiOutput', id).then((e) => {
            setMidiOutput(e.midiOutput);
          });

        }}
      />
    </>

  );
}

