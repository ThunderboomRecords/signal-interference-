
# Signal Interference

Signal interference is an application used to generate solos with AI. The application is controlled from a DAW using MIDI and has a build in sequencer which responds to an ecxternal midi clock. To use the application a song or multiple songs can be created. The song requires training data to work. After this this training data can be used to generate new musical phrases based upon recorded input.

## Developmnent

The application is an electron based nodejs application with a React front-end.

### Requirements
 - Nodejs version 24 or above: https://nodejs.org/en/download
 - A DAW with MIDI compatability. We recommend using Ableton Live: https://www.ableton.com/en/

### Installation
Installation can be done using [mise](https://mise.jdx.dev/) by running the command: ``mise i``

After this npm needs to install packages which can be done by running: ``npm i``

### Running the application
The application can be run by using the following command: ``npm run start``

### How to use the application 
![alt text](./assets/images/screenshot_signal_inference.png "Logo Title Text 1")

#### Top section: Generation & MIDI setup 
    - PLAY: Play generated solo
    - STOP: Stop generated solo from playing 
    - RECORD: Record your own solo to be used by the model. 
    - GENERATE: Generate a solo
    - TIMING: Set timing correction in OFF (no timing correction), MODEL 1 (small timing correction), MODEL 2 (bigger timing correction). If you feel that the model is producing a solo's where the timing of the solo's seem a bit off, use this to correct the offset. 
    - DAW: 
    - INPUT: This is the name channel that receives incoming MIDI messages from a DAW
    - OUTPUT: This is the name of the channel that sends outgoing MIDI messages to a DAW

#### Middle section: ABC notation of current generated solo (not 100% accurate) & Songs
    - Song title: Type your song title here
    - Midi input file: Select a .mid file from your computer that contains the MIDI data you want to use; for guidance on preparing the dataset, see the Recommended Workflow section. The Markov order controls how many previous notes the model considers when generating new ones: a higher value (for example, 12) produces solos that are more predictable and structured, while a lower value (such as 2) results in solos that are less predictable and more varied.
    - Generation length: The generation length specifies the number of bars the model will create in the output.
    - MIDI selection message: This is a CC control message used in Ableton to reference a specific song. For details on integrating MIDI messaging with your DAW, see the Recommended Workflow section.
    - Delete button: Delete the song 

#### Bottom section
- Open project: Open a saved Signal Inference Project
- Save project: Save a Signal Inference Project
- Save current history of project: This will save the generated solo's 

### Recommended workflow
1. Collect MIDI training data
2. Instal and run the application
3. Integrate MIDI messaging with Ableton Live
4. Play with Signal Inference
5. Reflect, tweak, experiment etc.

### Releasing the application
Application releases are build manually. To create a manual release, please update the version number in package.json and run the following command: ``npm run package``

### Structure
The application has a basic file structure for electron application developmen. The top level file structure is:
 - package.json: The pacakge file for the application
 - mise.toml: mise version file
 - src: source folder containing all the code.
 - assets: assets folder, provides test midi data and some test files, as well as static assets like images and icons.

The src folder is split up in 4 main folder for the application:
 - main: This contains the code for the electron back-end (everything running locally on the machine).
 - preload: The preload script which is specific to electron
 - renderer: This contains all the front-end code for electron.
 - utils: utillity functions which are used throughout the code base.


