export interface TracePathSegmentLine {
  type: 'L';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export interface TracePathSegmentCurve {
  type: 'Q';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
};

export interface TracePath {
  boundingbox: [number, number, number, number];
  holechildren: number[];
  isholepath: boolean;
  segments: (TracePathSegmentLine | TracePathSegmentCurve)[]
};

export type Layer = TracePath[];

export type PaletteColor = [number, number, number, number];

export interface TraceData {
  layers: Layer[];
  palette: PaletteColor[];
  width: number;
  height: number;
};

export type Point = [number, number];

export interface Keypoint {
  ki: number;
  point: Point;
  score: number;
}

export interface Pose {
  keypoints: Keypoint[]
}

export function normalizeTraceData(traceData:TraceData){
  const { layers, width, height } = traceData;
  for(const layer of layers){
    for(const path of layer){
      let { boundingbox, segments } = path;
      // normalize bounding box
      boundingbox.forEach(
        (v, i) => {
          boundingbox[i] /= i % 2 === 0
          ? width
          : height
        }
      );
      // normalize segments
      for(const segment of segments){
        for(const xKey of ['x1', 'x2', 'x3']){
          if(segment.hasOwnProperty(xKey)){
            segment[xKey] /= width;
          }
        }
        for(const yKey of ['y1', 'y2', 'y3']){
          if(segment.hasOwnProperty(yKey)){
            segment[yKey] /= height;
          }
        }
      }
    }
  }
  return traceData;
}

interface PersonGroup {
  poses: Pose[],
  layer: Layer
}

export function getPosesForSegments(segments: (TracePathSegmentLine | TracePathSegmentCurve)[], poses: Pose[]) : Pose[] {
  // TODO, in this function, create a polygon from segments, and check which poses
  // have keypoints that fall within that polygon
  return poses;
}

export function mergeTraceDataWithPoses(traceData: TraceData, poses: Pose[]) : PersonGroup[] {
  const { layers } = traceData;
  const personGroups : PersonGroup[] = [];

  for(const layer of layers){
    for(const path of layer){
      let matchingPoses = getPosesForSegments(path.segments, poses);
      if(matchingPoses.length){
        personGroups.push({
          poses: matchingPoses,
          layer
        })
      }
      
    }
  }
  return personGroups;
}