import midi from 'midi';

const clockInput = new midi.Input(); // also DAW input
const noteInput = new midi.Input();
const outputPort = new midi.Output();

