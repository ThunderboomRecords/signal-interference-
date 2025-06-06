import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import './index.css';

function MidiSelector(props: {
  inputList: string[];
  selectCallback: (id: number) => void;
  updateContent: () => void;
}) {
  const { inputList, selectCallback, updateContent } = props;

  return (
    <div className="select-wrapper">
      <Select onOpenChange={() => { updateContent(); }} onValueChange={(value: number) => { selectCallback(value) }}>
        <SelectTrigger className="w-[180px]" >
          <SelectValue placeholder="MidiInput" />
        </SelectTrigger>
        <SelectContent >
          {
            inputList.map((inputName: string, index: number) => {
              return (
                <SelectItem value={index}>{inputName}</SelectItem>
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
  selectCallback: (id: number) => void;
  updateContent: () => void;
}) {
  const { inputList, labelName, selectCallback, updateContent } = props;
  return (
    <div className="midi-selector">
      <label>
        {labelName}
      </label>
      <MidiSelector
        inputList={inputList}
        selectCallback={selectCallback}
        updateContent={updateContent}
      />
    </div>

  )

}

// TODO: Add history for this so it remembers the configuration and default io config
export default function MidiSelect() {
  const [midiIO, setMidiIO] = useState<{ input: string[], output: string[] }>({ input: [], output: [] });

  const getContents = async () => {
    console.log(window);
    const inputs = await window.electronApi.getMidiInputs();
    setMidiIO(inputs);
    console.log(inputs);
  }
  useEffect(() => {
    getContents();
  }, []);

  return (
    <>
      <SingleSelector
        inputList={midiIO.input}
        labelName="Clock"
        updateContent={getContents}
        selectCallback={(id) => {
          console.log('clock selected', id);
          window.electronApi.setClock(id);
        }}
      />

      <SingleSelector
        inputList={midiIO.input}
        labelName="Input"
        updateContent={getContents}
        selectCallback={(id) => {
          console.log('input selected', id);
          window.electronApi.setInputChannel(id);
        }}
      />

      <SingleSelector
        inputList={midiIO.output}
        labelName="Output"
        updateContent={getContents}
        selectCallback={(id) => {
          console.log('output selected', id);
          window.electronApi.setOutputChannel(id);
        }}
      />
    </>

  );
}

