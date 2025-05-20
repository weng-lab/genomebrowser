# Core Concepts

The Genome Browser displays genomic data through the use of "track" components. Each component displays different types of information. The three most common tracks are `bigWigs`, which display signal data, `bigBed` which displays regions of interest, and the `transcript` track, which displays genes. 

Combine tracks, along with the ruler, to view this data. You can pan left and right to change the region, as well as call methods to interact with the browser for more functionality. 

## Stores

There are multiple Zustand stores that hold information for different purposes. There are three main stores that hold the majority of the configuration and state of the browser. 

These are:
1. Browser store
2. Track store
3. Data store

There is also the:
1. Context Menu store
2. Modal store
3. Theme store

### Browser store

The browser store holds the configuration for setting up the browser. This includes the width of all the tracks, the genomic region, and other internal state. Interacting with the browser should cause all tracks within to update, as they are all dependent on it's state.

### Track store

The track store contains the configurations for all the tracks in the browser. These configurations contain information for how to display the track. This includes the display mode, the track type, the color and some other optional props depending on the track type. The browser automatically spawns the respective component internally, and bases the component off this configuration. You can interact with individual tracks using this store to update the different fields within a track's configuration. 

### Data store

This store holds all the data for each track. It does this with a map, that uses the track's unique ID for indexing. The data store was built to avoid putting the data inside the track store itself, and allows the browser to check the state of fetches, errors, and other data related state. 

#### Other stores

The context menu store contains information relating to the track that activated the context menu. It is small as it only holds the position of the mouse click and the track's id. 

The modal store also contains setup for the modal such as the position and track id.

And finally the theme store, which just holds theme related configuration. 
