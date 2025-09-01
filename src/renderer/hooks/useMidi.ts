
import { useEffect, useState } from "react";
import { MidiInterfaceInfo } from "../../main/types";

export default function useMidi() {
  const [dawPort, setDawPort] = useState<MidiInterfaceInfo | undefined>(undefined);
  const [inputPort, setInputPort] = useState<MidiInterfaceInfo | undefined>(undefined);
  const [outputPort, setOutputPort] = useState<MidiInterfaceInfo | undefined>(undefined);
  const [availableInputPorts, setAvailableInputPorts] = useState<MidiInterfaceInfo[]>([]);
  const [availableOutputPorts, setAvailableOutputPorts] = useState<MidiInterfaceInfo[]>([]);

  const getContents = async () => {
    const io = await window.electronApi.midiConfiguration.getMidiPorts();
    setAvailableInputPorts(io.input);
    setAvailableOutputPorts(io.output);
  }
  useEffect(() => {
    window.electronApi.midiConfiguration.onMidiInput((value: MidiInterfaceInfo) => {
      setInputPort(value);
    });
    window.electronApi.midiConfiguration.onMidiOutput((value: MidiInterfaceInfo) => {
      setOutputPort(value);
    });
    window.electronApi.midiConfiguration.onMidiDawInput((value: MidiInterfaceInfo) => {
      setDawPort(value);
    });

    getContents();
    return (
      () => {
        window.electronApi.midiConfiguration.onMidiInput(() => { /*intentionally empty */ });
        window.electronApi.midiConfiguration.onMidiOutput(() => { /*intentionally empty */ });
        window.electronApi.midiConfiguration.onMidiDawInput(() => { /*intentionally empty */ });
      }
    )
  }, []);

  return {
    dawPort,
    inputPort,
    outputPort,
    setDawPort: (port: { name: string }) => {
      window.electronApi.midiConfiguration.setDawInput(port.name);
    },
    setInputPort: (port: { name: string }) => {
      window.electronApi.midiConfiguration.setInputChannel(port.name);
    },
    setOutputPort: (port: { name: string }) => {
      window.electronApi.midiConfiguration.setOutputChannel(port.name);
    },
    availableInputs: availableInputPorts,
    availableOutputs: availableOutputPorts,
    refreshPorts: () => { getContents() }
  }
}
