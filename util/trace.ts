import pointInPolygon from 'point-in-polygon';
import glVec2 from 'gl-vec2';
import { memoize } from 'lodash';
// import { vectorDifference } from './vector';

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

export type HeatmapRegion = {
  x: number;
  y: number;
  coords: () => [number, number];
  score: number;
  visited?: boolean;
  finished?: boolean;
  contour?: Contour;
  usedBinaryVerteces?: Point[];
  usedEmptyNeighbors: HeatmapRegion[]
}

export const isSameHeatmapRegion = (p0, p1) => p0.x === p1.x && p0.y === p1.y;
export type ContourVertex = [ number, number ];
export type Contour = ContourVertex[];
export type Heatmap = number[][];

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

/* 
// returns all neighbors including diagonals
* * *
* ? *
* * *
*/
export const neighborOffsets = [
  [-1, -1], // top left
  [0, -1], // top center
  [1, -1], // top right
  [1, 0], // center right
  [1, 1], // bottom right
  [0, 1], // bottom center
  [-1, 1], // bottom left
  [-1, 0] // center left
];


/*
// returns only adjacent neigbhors
  *
* ? *
  *  
*/
export const adjacentNeighborsOffsets = neighborOffsets.filter((_, i) => i % 2 === 1)

/*
// return corners around a region 
*-*
|?|
*-*
*/
const edgeOffsets : Point[] = [
  [0,0], // top left
  [1,0], // top right
  [1,1], // bottom right
  [0,1] // bottom left
];

function regionSharesPoint(region:HeatmapRegion, p:Point) : Point {
  return edgeOffsets.find(
    ([dx, dy]) => region.x + dx === p[0] && region.y + dy === p[1]
  );
}

function getSharedVertices(r0:HeatmapRegion, r1:HeatmapRegion) : Point[] {
  // find corners of r0
  const corners0 : Point[] = edgeOffsets.map(([dx, dy]) => [r0.x + dx, r0.y + dy]);
  const sharedVertices : Point[] = [];
  for(const corner of corners0){
    // iterate through all corners to see if they are shared with r2
    if(regionSharesPoint(r1, corner)){
      sharedVertices.push(corner);
    }
    if(sharedVertices.length > 1){
      break;
    }
  }
  return sharedVertices;
}

// function clamp(val:number, min:number, max:number){
//   return Math.min(
//     Math.max(min, val),
//     max
//   );
// }

interface ScoreAdjustedVertexParams {
  rEdge: HeatmapRegion;
  rEmpty: HeatmapRegion;
  vertex: Point;
}
function getScoreAdjustedVertex({ rEdge, rEmpty, vertex } : ScoreAdjustedVertexParams) : Point {
  let { score } = rEdge;
  const dx = rEdge.x - rEmpty.x;
  const dy = rEdge.y - rEmpty.y;

  const scoreAdjustmentFactor = Math.sqrt(1 - score);
  return [
    vertex[0] + (dx * scoreAdjustmentFactor),
    vertex[1] + (dy * scoreAdjustmentFactor)
  ];
}

function getSlope(p0:Point, p1:Point) : number {
  return (p1[1] - p0[1])/(p1[0] - p0[0]);
}

/*
STRATEGY:
scan entire heatmap
when you find a region that is an edge (has a non-zero score and has 1 or more adjacent empty neighbors) and does not have a `contours` object
	- take current edge region `currentEdgeRegion`
	- create `contours` and `binaryContours` arrays
	- for `currentEdgeRegion`
		- assign `currentEdgeRegion.contours` to `contours`
		- create an array of its `emptyAdjacentNeighbors`
		- get `currentEmptyAdjacentNeighbor` which is the empty adjacent neighbor that shares a corner with most recent `binaryContours` (if none exists, just pick any of emptyAdjacentNeighbors)
		- for `currentEmptyAdjacentNeighbor`
			- get the two points where `currentEmptyAdjacentNeighbor` and `currentEdgeRegions` meet.  filter for points that are not equivalent to last `binaryContours` point
				- if any filtered points are equivalent to the first `binaryContours` element, exit the entire loop
				- add filtered points to `binaryContours`
				- shift those same points based on the score value for `currentEdgeRegion` and add them to `contours`
			- remove `currentEmptyAdjacentNeighbor` from `emptyAdjacentNeighbors`
		- find next `currentEmptyAdjacentNeighbor`
			- find an element in `emptyAdjacentNeighbors` that has a corner that matches the last element of `binaryContours`
		- if `currentEmptyAdjacentNeighbor` is found then reenter loop above
		- else find next `currentEdgeRegion`, look through all neighbors of `currentEdgeRegion` including diagonals and find one that has a corner that matches last element of `binaryContours`
		- reenter `currentEdgeRegion` loop

*/
export function convertHeatmapToContours(heatmap:Heatmap) : Contour[]{
  const width = heatmap[0].length;
  const height = heatmap.length;
  let contours = [];  
  let c = 0;
  let r = 0;  

  const getRegionAt = memoize(
    function getRegionAtFn(x : number, y : number) : HeatmapRegion {
      return {
        x,
        y,
        coords: () => [x,y],
        score: heatmap[y] && typeof heatmap[y][x] === 'number'
          ? heatmap[y][x]
          : null,
        usedBinaryVerteces: [],
        usedEmptyNeighbors: []
      };
    },
    function getRegionAtResolver(x, y){
      return `${x},${y}`;
    }
  );

  function isContourEdgeRegion(p : HeatmapRegion) : boolean {
    // if this pixel is not empty and it has at least one empty neighbor 
    return !!p.score && !!adjacentNeighborsOffsets.find(([dx,dy]) => {
      const n = getRegionAt(p.x+dx, p.y+dy);
      return !n.score;
    });
  }

  function getAdjacentNeighbors(region) : HeatmapRegion[] {
    return adjacentNeighborsOffsets.map(([dx, dy]) => getRegionAt(region.x+dx, region.y+dy));
  }

  function getNextEdgeRegion(currentEdgeRegion : HeatmapRegion, lastBinaryContourVertex: Point) : HeatmapRegion | undefined {
    // look for all neighbors, including diagonals, and find one that shares the previous contour point
    for(const [dx, dy] of neighborOffsets){
      const neighbor = getRegionAt(currentEdgeRegion.x + dx, currentEdgeRegion.y + dy);
      if(
        !neighbor.finished 
        && 
        isContourEdgeRegion(neighbor) 
        && 
        // it is connected to our previous binary contour
        regionSharesPoint(neighbor, lastBinaryContourVertex) 
        && 
        // it hasn't already used that binary contour
        !neighbor.usedBinaryVerteces.find(([x, y]) => lastBinaryContourVertex[0] === x && lastBinaryContourVertex[1] === y)
      ){
        return neighbor;
      }
      continue;
    }
    return undefined;
  }

  while(r < height && c < width){
    let p : HeatmapRegion = getRegionAt(c, r);

    if(isContourEdgeRegion(p) && !p.finished){
      // found edge pixel, start creating a contour array
      let contour = [];
			let binaryContour = [];
			let currentEdgeRegion = p;
      function getLastBinaryContourVertex() : Point | undefined {
        return binaryContour[binaryContour.length - 1]
      }

			while(currentEdgeRegion){
				currentEdgeRegion.contour = contour;
        currentEdgeRegion.visited = true;
				let emptyNeighbors : HeatmapRegion[] = getAdjacentNeighbors(currentEdgeRegion)
          .filter(region => !region.score && currentEdgeRegion.usedEmptyNeighbors.indexOf(region) === -1);

				function findNextEmptyNeighbor(){
          // if nothing has been added to the contour, just take the first empty neighbor and go with that
					if(!binaryContour.length){
						return emptyNeighbors[0];
					}
					return emptyNeighbors.find(emptyNeighbor => regionSharesPoint(emptyNeighbor, binaryContour[binaryContour.length-1]));
				}

        let currentEmptyNeighbor = findNextEmptyNeighbor();
				while(currentEmptyNeighbor){
          let lastBinaryContourVertex = getLastBinaryContourVertex();
          let sharedBinaryVertices = getSharedVertices(currentEdgeRegion, currentEmptyNeighbor)
            // filter for only new shared vertices
            .filter(
              ([vx, vy]) => {
                return !lastBinaryContourVertex || !(vx === lastBinaryContourVertex[0] && vy === lastBinaryContourVertex[1])
              }
            );
          // add binary vertices to binary contour
          binaryContour = binaryContour.concat(
            sharedBinaryVertices
              // .filter(
              //   ([vx, vy]) => !lastBinaryContourVertex || lastBinaryContourVertex[0] !== vx || lastBinaryContourVertex[1] !== vy
              // )
          );
          // add to adjusted vertices to contour
          contour = contour.concat(
            sharedBinaryVertices.map(sharedBinaryVertex => getScoreAdjustedVertex({
              rEdge: currentEdgeRegion, 
              rEmpty: currentEmptyNeighbor, 
              vertex: sharedBinaryVertex
            }))
          );
          // now that we have used this currentEmptyNeighbor, remove it from the emptyNeighbors array
          emptyNeighbors.splice(emptyNeighbors.indexOf(currentEmptyNeighbor), 1);
          // add reference to shared binary vertices onto region
          const uniqueSharedVertices = sharedBinaryVertices.filter(
            ([x, y]) => !currentEdgeRegion.usedBinaryVerteces.find(v => v[0] === x && v[1] === y)
          );
          currentEdgeRegion.usedBinaryVerteces = currentEdgeRegion.usedBinaryVerteces.concat(uniqueSharedVertices);
          // add empty neighbor to the used list
          currentEdgeRegion.usedEmptyNeighbors.push(currentEmptyNeighbor);
          currentEmptyNeighbor = findNextEmptyNeighbor();
				}

        // important, this checks to see if all empty neighbors have been used up
        // if so, this region is marked as finished, which tells the loop to skip it when encountered again
        currentEdgeRegion.finished = emptyNeighbors.length === 0;

        // no more contiguous empty neighbors, try to find a new edge region
        currentEdgeRegion = getNextEdgeRegion(currentEdgeRegion, getLastBinaryContourVertex());
			}
      contours.push(contour);
    }
    // iterate
    c += 1;
    if(c >= width){
      c = 0;
      r += 1;
    }
  }

  // post process contours
  // TODO remove contiguous points that have the same slope
  contours = contours.map(
    c => {
      // c = c.reduce(
      //   (acc, v, i, arr) => {
      //     const prev = arr[i-1];
      //     if(
      //       prev
      //       &&
      //       glVec2.len(vectorDifference(v, prev)) < 1
      //     ){
      //       acc.pop();
      //       acc.push([
      //         (v[0]+prev[0])/2,
      //         (v[1]+prev[1])/2
      //       ])
      //     }
      //     else {
      //       acc.push(v);
      //     }
      //     return acc;
      //   },
      //   []
      // );

      c = c.reduce(
        (acc, v, i, arr) => {
          const prev1 = arr[i-1];
          const prev2 = arr[i-2];
          if(
            i < arr.length-3 &&
            prev1 && prev2 &&
            getSlope(prev2, prev1) === getSlope(prev1, v)
          ){
            acc.pop();
          } 
          acc.push(v);
          return acc;
        },
        []
      );
      return c;
    }
  );

  return contours;
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