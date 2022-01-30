import pointInPolygon from 'point-in-polygon';
import glVec2 from 'gl-vec2';

export const KEYPOINTS = [
  'nose',
  'left eye',
  'right eye',
  'left ear',
  'right ear',
  'left shoulder',
  'right shoulder',
  'left elbow',
  'right elbow',
  'left wrist',
  'right wrist',
  'left hip',
  'right hip',
  'left knee',
  'right knee',
  'left ankle',
  'right ankle'
];

// define primary detection keypoints to detect a person
export const detectionKeypointIndeces = [
  0, // nose
  1, // left eye
  2, // right eye
  5, // left shoulder
  6, // right shoulder
  7, // left knee
  8, // right knee
  11, // left hip
  12 // right hip
];

export type Point = [number, number];

export interface Keypoint {
  ki: number;
  pos: Point;
  score: number;
  dpos: [number, number] | null;
  dt: number | null;
  mv: number | null;
}

export interface Pose {
  keypoints: Keypoint[]
}

export interface Dimensions {
  width: number,
  height: number
}

export type Contour = number[][];

export const truncateFloat = ((n : number) : number => Math.round(n * 10000)/10000);

export function normalizeContours(contours : Contour[], { width, height }: Dimensions) : Contour[] {
  contours.forEach(
    path => {
      // normalize to 0..1 coords
      path.forEach(
        point => {
          point[0] = truncateFloat(point[0] / width);
          point[1] = truncateFloat(point[1] / height);
        }
      )
    }
  );
  return contours;
}

export function normalizePose(pose : Pose) : Pose {
  for(const keypoint of pose.keypoints){
    keypoint.pos = [
      truncateFloat(keypoint.pos[0]),
      truncateFloat(keypoint.pos[1])
    ];
    if(typeof keypoint.score === 'string'){
      keypoint.score = truncateFloat(parseFloat(keypoint.score));
    }
  }
  return pose;
}

export interface PersonGroup {
  id?: number,
  contour: Contour,
  holes: Contour[],
  bbox?: [
    [number, number],
    [number, number]
  ] | null,
  poses: Pose[]
}

/* 
iterate through poses, and find the contours they correspond to :
* contain a pose (which means they are definitely a person)
* are contained within another pose which means they are a hole contour
*/
export function getPersonGroups(contours : Contour[], poses: Pose[]) : PersonGroup[] {
  const personGroups = [];
  // start by looking through poses
  for(const pose of poses){
    // check all contours to find one that has this pose inside it
    let foundContourForPose : boolean = false;
    for(const contour of contours){
      for(let ki of detectionKeypointIndeces){
        const poseKeypoint = pose.keypoints.find(({ki: ki0}) => ki === ki0);
        if(poseKeypoint && pointInPolygon(poseKeypoint.pos, contour)){
          // this contour contains a detection keypoint
          foundContourForPose = true;
          // look for an existing group that has this contour
          let group : PersonGroup = personGroups.find(
            ({contour: contour0}) => contour0 === contour
          );
          if(!group){
            group = {
              contour,
              holes: [],
              poses: []
            }
            personGroups.push(group);
          }
          // add pose to group and exit 
          group.poses.push(pose);
          break;
        }
      }
      if(foundContourForPose){
        break;
      }
    }
  }

  // compute bounding box from contour
  personGroups.forEach(
    (personGroup: PersonGroup) => {
      const { contour } = personGroup;
      const bbox : [[number, number], [number, number]] = [[1,1],[0,0]];
      for(const [x, y] of contour){
        const minX = bbox[0][0] || 1;
        const maxX = bbox[1][0] || 0;
        const minY = bbox[0][1] || 1;
        const maxY = bbox[1][1] || 0;

        // set min x
        if(minX !== 0 && x < minX){
          bbox[0][0] = x;
        }
        // set max x
        else if(maxX !== 1 && x > maxY) {
          bbox[1][0] = x;
        }

        // set min y
        if(minY !== 0 && y < minY){
          bbox[0][1] = y;
        }
        // set max y
        else if(maxY !== 1 && y > maxY) {
          bbox[1][1] = y;
        }
      }
      personGroup.bbox = bbox;        
    }
  )

  // compute hole contours
  const matchedContours = personGroups.map(({contour}) => contour);
  const unmatchedContours = contours.filter(c => !matchedContours.includes(c));
  for(const unmatchedContour of unmatchedContours){
    for(const matchedContour of matchedContours){
      if(pointInPolygon(unmatchedContour[0], matchedContour)){
        // if this unmatched contour is inside a matched contour, then add it as a hole
        // to the person group with that matched contour
        const { holes } = personGroups.find(({contour}) => contour === matchedContour);        
        holes.push(unmatchedContour);
        break;
      }
    }
  }
  return personGroups;
}

export interface Frame {
  t: number,
  width: number,
  height: number,
  personGroups: PersonGroup[]
}

// keep a list of frames in memory
export let frames : Frame[] = [];
export function addFrame(frame: Frame) : Frame[] {
  frames.unshift(frame);
  frames = frames.slice(0, 5);
  return frames;
}

let totalPersonCount = 0;
export function processIncomingFrame(frame : Frame) : Frame {
  const { t, personGroups, width, height } = frame;
  personGroups.forEach(
    (group, i) => {
      const { poses, bbox } = group;
      // compute personGroup height from the bounding box
      const bodyHeightPx = (bbox[1][1] - bbox[0][1]) * height;
      
      let numberOfMatchingKeypoints = 0;
      let matchingPersonGroup;

      // look at the last three frames
      for(let i=0; i<3; i++){
        let comparisonFrame = frames[frames.length-(1 + i)];
        if(!comparisonFrame){
          break;
        }        
                
        for(let comparisonPersonGroup of comparisonFrame.personGroups){          
          let matchingKeypoints = new Map();
          let comparisonKeypoints : Keypoint[] = comparisonPersonGroup.poses.reduce(
            (acc, v) => {
              acc = acc.concat(v.keypoints);
              return acc;
            },
            []
          );

          for(let pose of poses){
            for(let keypoint of pose.keypoints){
              // if keypoint already has a dpos (velocity), then continue
              // TODO maybe find a better way to exit here
              if(Array.isArray(keypoint.dpos)){
                continue;
              }
              // get position of this keypoint in pixel units
              let keypointPositionPx = glVec2.set(
                glVec2.create(),
                keypoint.pos[0] * width,
                keypoint.pos[1] * height
              );

              const matchingKeypoint : Keypoint = comparisonKeypoints
                // find keypoints with same id in comparison frame
                .filter(k => k.ki === keypoint.ki)
                // find the one that is the closest and within the threshold
                .reduce(
                  (acc, v) => {
                    const comparisonPointPx = glVec2.set(
                      glVec2.create(), 
                      v.pos[0] * comparisonFrame.width,
                      v.pos[1] * comparisonFrame.height
                    );
                    const distancePx = glVec2.distance(comparisonPointPx, keypointPositionPx);
                    // if this point is within the threshold relative to body height
                    // and is closer than other matching points
                    if(                      
                      distancePx / bodyHeightPx <= 0.1
                      &&
                      (!acc || glVec2.distance(glVec2.set(glVec2.create(), acc.pos[0] * width, acc.pos[1] * height), keypointPositionPx) > distancePx)
                    ){
                      acc = v;
                    }
                    return acc;
                  },
                  null               
                );

              // this keypoint matches
              if(matchingKeypoint){
                // associate the current keypoint with its matchingKeypoint
                matchingKeypoints.set(keypoint, matchingKeypoint);
              }
            }
          }

          // this comparison group has more matching keypoints, so it is considered the matchingPersonGroup
          if(matchingKeypoints.size > numberOfMatchingKeypoints){
            matchingPersonGroup = comparisonPersonGroup;
          }

          // step through each matching keypoint and calculate stateful values
          matchingKeypoints.forEach(
            (currentKeypoint : Keypoint, previousKeypoint: Keypoint) => {
              // set change in position (velocity)
              currentKeypoint.dpos = glVec2.subtract(glVec2.create(), currentKeypoint.pos, previousKeypoint.pos);
              // set change in time (ms)
              currentKeypoint.dt = t - comparisonFrame.t
              // create a movement factor, which is the length of the dpos vector, over time, over body height 
              // to account for distance from the camera              
              currentKeypoint.mv = glVec2.length([0,0], currentKeypoint.dpos) / currentKeypoint.dt / bodyHeightPx * 1000;
            }
          );
        }

      }
      
      // assign an id to this group, either from a match that was found
      // or from incrementing
      let id = totalPersonCount;
      if(matchingPersonGroup){
        id = matchingPersonGroup.id;
      }
      // no matching personGroup was found, so try to increment
      else {
        while(personGroups.find(pg => pg.id === id)){
          totalPersonCount += 1;
          id = totalPersonCount;
        }
      }
      group.id = id;
    }
  )
  addFrame(frame);
  return frame;
}