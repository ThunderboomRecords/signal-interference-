import ToneJS from '@tonejs/midi';
import HigherOrderMarkovChain from './markov.mts';
import { parseMidiFile, saveMidiFile } from './midiFileIO.mts';
import type { NoteEvent } from './types.mts';
import './liveMidi.mts';

async function run() {
  const notes = await parseMidiFile('assets/midi/solo.mid');
  console.log('Parsed Notes:', notes);

  const order = 12; // Higher-order chain
  const chain = new HigherOrderMarkovChain<NoteEvent>(order);
  chain.addSequence(notes);

  const startIdx = Math.floor(Math.random() * (notes.length - order));
  const startSequence = notes.slice(startIdx, startIdx + order);

  const generated = chain.generate(startSequence, 50); // Generate 50 notes
  console.log('Generated Sequence:', generated);

  await saveMidiFile(generated, 'dist/output-weighed-hoc.mid');
  console.log('MIDI file saved!');
}

//run();
