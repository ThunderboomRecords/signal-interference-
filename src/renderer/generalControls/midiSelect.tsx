import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { setDawInput } from "src/main/app";
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
  console.log({ currentInput });
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
  const [currentDawInput, setDawInput] = useState<string | undefined>(undefined);
  const [currentMidiInput, setMidiInput] = useState<string | undefined>(undefined);
  const [currentMidiOutput, setMidiOutput] = useState<string | undefined>(undefined);



  const getContents = async () => {
    const inputs = await window.electronApi.midiConfiguration.getMidiInputs();
    setMidiIO(inputs);
  }

  useEffect(() => {
    getContents();
    window.electronApi.midiConfiguration.onMidiInput((value: MidiInterfaceInfo) => {
      setMidiInput(value.name);
    });
    window.electronApi.midiConfiguration.onMidiOutput((value: MidiInterfaceInfo) => {
      setMidiOutput(value.name);
    });
    window.electronApi.midiConfiguration.onMidiDawInput((value: MidiInterfaceInfo) => {
      console.log(value);
      setDawInput(value.name);
    });
  }, []);

  return (
    <>
      <SingleSelector
        currentInput={currentDawInput}
        inputList={midiIO.input}
        labelName="Daw"
        updateContent={getContents}
        selectCallback={(id) => {
          window.electronApi.updateSetting('dawInput', id).then((e) => {

            setDawInput(e.dawInput);
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
            console.log({ e });
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

