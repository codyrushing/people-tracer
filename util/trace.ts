export interface TracePathSegmentLine {
  type: 'L';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TracePathSegmentCurve {
  type: 'Q';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
}

export interface TracePath {
  boundingbox: [number, number, number, number];
  holechildren: number[];
  isholepath: boolean;
  segments: (TracePathSegmentLine | TracePathSegmentCurve)[]
}

export type Layer = TracePath[];

export type PaletteColor = [number, number, number, number]

export interface TraceData {
  layers: Layer[];
  palette: PaletteColor[];
  width: number;
  height: number;
}

export function normalizeTraceData({layers, width, height}){
  // TODO, convert layers to normalized values (0..1) 
}