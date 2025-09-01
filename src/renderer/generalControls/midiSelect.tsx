import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import useMidi from "../hooks/useMidi";
import './index.css';

function MidiSelector(props: {
  inputList: string[];
  selectCallback: (id: string) => void;
  updateContent: () => void;
  currentInput?: string;
}) {
  const { inputList, selectCallback, updateContent, currentInput } = props;

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
            inputList.map((inputName: string) => {
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

