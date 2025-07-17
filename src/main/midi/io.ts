import midi from 'midi';
import { MidiInterfaceInfo } from '../types';

export class MidiIO {
  dawInput: midi.Input;
  noteInput: midi.Input;
  outputPort: midi.Output;
  constructor() {
    this.dawInput = new midi.Input(); // also DAW input
    this.noteInput = new midi.Input();
    this.outputPort = new midi.Output();
  }
  destructor() {
    this.dawInput.closePort();
    this.noteInput.closePort();
    this.outputPort.closePort();
  }
  setDawPort(dawId: number | string) {
    this.dawInput.closePort();

    if (typeof dawId === 'string') {
      dawId = getMidiPortNumberByName(dawId, 'input');
    }
    if (dawId < 0) {
      // disables port
      return;
    }
    this.dawInput.openPort(dawId);
    this.dawInput.ignoreTypes(false, false, false);
  }

  setInputPort(inputId: number | string) {
    this.noteInput.closePort();
    if (typeof inputId === 'string') {
      inputId = getMidiPortNumberByName(inputId, 'input');
    }
    if (inputId < 0) {
      // disables port
      return;
    }
    this.noteInput.openPort(inputId);
    this.noteInput.ignoreTypes(false, false, false);
  }
  setOutputPort(outputId: number | string) {
    this.outputPort.closePort();
    if (typeof outputId === 'string') {
      outputId = getMidiPortNumberByName(outputId, 'output');
    }
    if (outputId < 0) {
      // disables port
      console.log('output port disabled', { outputId });
      return;
    }
    this.outputPort.openPort(outputId);
  }

  getDawPort() {
    return this.dawInput;
  }
  getInputPort() {
    return this.noteInput;
  }
  getOutputPort() {
    return this.outputPort;
  }
}


function getMidiPorts(io: midi.Input | midi.Output): MidiInterfaceInfo[] {
  const count = io.getPortCount();
  const ports: MidiInterfaceInfo[] = [];
  for (let i = 0; i < count; i++) {
    const name = io.getPortName(i);
    ports.push({ name, index: i });
  }
  return ports;
}

export function getMidiIOPorts() {
  const input = new midi.Input();
  const output = new midi.Output();
  const inputPorts = getMidiPorts(input);
  const outputPorts = getMidiPorts(output);
  const ret = {
    input: inputPorts,
    output: outputPorts
  };
  return ret;
}

export function getMidiPortNumberByName(name: string, portType: 'input' | 'output') {
  const ports = getMidiIOPorts();
  if (portType === 'input') {
    const ind = ports.input.findIndex((port) => port.name === name);
    return ind;
  }
  const ind = ports.output.findIndex((port) => port.name === name);
  return ind;
}


export const midiPorts = new MidiIO();
