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
  setClockPort(clockId: number) {
    this.clockInput.closePort();
    this.clockInput.openPort(clockId);
  }
  setInputPort(inputId: number) {
    this.noteInput.closePort();
    this.noteInput.openPort(inputId);
  }
  setOutputPort(outputId: number) {
    this.outputPort.closePort();
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

export const midiPorts = new MidiIO();

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

