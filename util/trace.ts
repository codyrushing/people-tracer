import pointInPolygon from 'point-in-polygon';

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
  point: Point;
  score: number;
  v?: [number, number]
}

export interface Pose {
  keypoints: Keypoint[]
}

export interface PersonGroup {
  poses: Pose[]
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
    keypoint.point = [
      truncateFloat(keypoint.point[0]),
      truncateFloat(keypoint.point[1])
    ];
    if(typeof keypoint.score === 'string'){
      keypoint.score = truncateFloat(parseFloat(keypoint.score));
    }
  }
  return pose;
}

export interface PersonGroup {
  contour: Contour,
  holes: Contour[],
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
    // check all contours to find one that is 
    let foundContourForPose : boolean = false;
    for(const contour of contours){
      for(let ki of detectionKeypointIndeces){
        const poseKeypoint = pose.keypoints.find(({ki: ki0}) => ki === ki0);
        if(poseKeypoint && pointInPolygon(poseKeypoint.point, contour)){
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
  t: Date,
  personGroups: PersonGroup[]
}

// keep a list of frames in memory
export let frames : Frame[] = [];
export function addFrame(frame: Frame) : Frame[] {
  frames.unshift(frame);
  frames = frames.slice(0, 5);
  return frames;
}

export function computePersonGroupContinuity(personGroups : PersonGroup[]) : PersonGroup[] {
  const previousFrame = frames[0];
  if(previousFrame){

  }
  return personGroups;
}