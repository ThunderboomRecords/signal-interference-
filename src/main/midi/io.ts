import midi from 'midi';

export class MidiIO {
  clockInput: midi.Input;
  noteInput: midi.Input;
  outputPort: midi.Output;
  constructor() {
    this.clockInput = new midi.Input(); // also DAW input
    this.noteInput = new midi.Input();
    this.outputPort = new midi.Output();
  }
  destructor() {
    this.clockInput.closePort();
    this.noteInput.closePort();
    this.outputPort.closePort();
  }
  setClockPort(clockId: number | string) {
    this.clockInput.closePort();
    if (typeof clockId === 'string') {
      clockId = getMidiPortNumberByName(clockId, 'input');
    }
    if (clockId < 0) {
      // disables port
      return;
    }
    this.clockInput.openPort(clockId);
    this.clockInput.ignoreTypes(false, false, false);
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
      return;
    }
    this.outputPort.openPort(outputId);
  }

  getClockPort() {
    return this.clockInput;
  }
  getInputPort() {
    return this.noteInput;
  }
  getOutputPort() {
    return this.outputPort;
  }
}


function getMidiPorts(io: midi.Input | midi.Output) {
  const count = io.getPortCount();
  const ports: string[] = [];
  for (let i = 0; i < count; i++) {
    const name = io.getPortName(i);
    ports.push(name);
  }
  return ports;
}

export function getMidiIOPorts() {
  const input = new midi.Input();
  const output = new midi.Output();
  const inputPorts = getMidiPorts(input);
  const outputPorts = getMidiPorts(output);
  return {
    input: inputPorts,
    output: outputPorts
  };
}

export function getMidiPortNumberByName(name: string, portType: 'input' | 'output') {
  const ports = getMidiIOPorts();
  if (portType === 'input') {
    const ind = ports.input.findIndex((port) => port === name);
    return ind;
  }
  const ind = ports.output.findIndex((port) => port === name);
  return ind;
}


export const midiPorts = new MidiIO();
