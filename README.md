
# Signal Interference

Signal interference is an application used to generate solos with AI. The application is controlled from a DAW using MIDI and has a build in sequencer which responds to an ecxternal midi clock.
To use the application a song or multiple songs can be created. The song requires training data to work. After this this training data can be used to generate new musical phrases based upon recorded input.

## Developmnent

The application is an electron based nodejs application with a React front-end. 

### Requirements
 - nodejs version 24 or above

### Installation
installation can be done using [mise](https://mise.jdx.dev/) by running the command: ``mise i``

After this npm needs to install packages which can be done by running: ``npm i``

### Running the application
The application can be run by using the following command: ``npm run start``

### Releasing the application
Application releases are build manually. To create a manual release, please update the version number in package.json and run the following command: ``npm run package``

### structure
The application has a basic file structure for electron application developmen. The top level file structure is:
    - package.json - The pacakge file for the application
    - mise.toml - mise version file
    - src - source folder containing all the code.
    - assets - assets folder, provides test midi data and some test files, as well as static assets like images and icons.

The src folder is split up in 4 main folder for the application:
    - main - This contains the code for the electron back-end (everything running locally on the machine).
    - preload - The preload script which is specific to electron
    - renderer - This contains all the front-end code for electron.
    - utils - utillity functions which are used throughout the code base.


