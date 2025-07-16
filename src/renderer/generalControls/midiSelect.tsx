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
import useMidi from "../lib/useMidi";
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
  updateContent?: () => void;
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
  const {
    dawPort,
    inputPort,
    outputPort,
    availableInputs,
    availableOutputs,
    setDawPort,
    setInputPort,
    setOutputPort,
    refreshPorts,
  } = useMidi();

  console.log({ dawPort });
  return (
    <>
      <SingleSelector
        currentInput={dawPort?.name}
        inputList={availableInputs.map(e => e.name)}
        labelName="Daw"
        updateContent={refreshPorts}
        selectCallback={(id) => {
          console.log("setting", id);
          setDawPort({ name: id });
        }}
      />

      <SingleSelector
        currentInput={inputPort?.name}
        inputList={availableInputs.map(e => e.name)}
        labelName="Input"
        updateContent={refreshPorts}
        selectCallback={(id) => {
          setInputPort({ name: id });
        }}
      />

      <SingleSelector
        currentInput={outputPort?.name}
        inputList={availableOutputs.map(e => e.name)}
        labelName="Output"
        updateContent={refreshPorts}
        selectCallback={(id) => {
          setOutputPort({ name: id });
        }}
      />
    </>

  );
}

