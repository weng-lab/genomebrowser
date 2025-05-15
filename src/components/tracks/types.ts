export interface TrackDimensions {
  multiplier: number; // multiplier for the amount of data to fetch
  totalWidth: number; // total width of the track, including extra sides
  viewWidth: number; // the width of the viewable area
  sideWidth: number; // the width of the side portions (hidden until dragged into view)
  sidePortion: number; // the percentage of total width the side portions take up
}
