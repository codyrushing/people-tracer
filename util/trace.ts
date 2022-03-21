import pointInPolygon from 'point-in-polygon';
import glVec2 from 'gl-vec2';
import { createVector, vectorDifference } from './vector';
import { memoize } from 'lodash';

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
  contour?: Contour
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

/*
// returns the pair of vertex offsets representing the shared border between two adjacent regions
// should look something like:
[
	[ [0,0], [1,0] ],
	[ [1,0], [1,1] ],
	[ [1, 1], [0,1] ],
	[ [0,1], [0,0] ]
]
*/
const adjacentSharedBorderOffsets : Point[][] = adjacentNeighborsOffsets.map(
	(_, i) => edgeOffsets.concat([edgeOffsets[0]]).slice(i, i+2)
);

function getSharedVertices(r0:HeatmapRegion, rCompare:HeatmapRegion) : Point[] | void {
	let i = 0;
	const sharedVertices = []
	for(const [dx, dy] of adjacentNeighborsOffsets){
		const x = r0.x + dx;
		const y = r0.y + dy;
		// if comparison region matchies this adjacentNeighborOffset, 
		// get the corresponding sharedBorderOffsets
		if(x === rCompare.x && y === rCompare.y){
			return adjacentSharedBorderOffsets[i]
				.map(
					([dx, dy]) => [r0.x+dx, r0.y+dy]
				)
		}
		i += 1;
	}
}

export function convertHeatmapToContours(heatmap:Heatmap) : Contour[]{
  const width = heatmap[0].length;
  const height = heatmap.length;
  const contours = [];  
  let c = 0;
  let r = 0;  

  const getRegionAt = memoize(
    function getRegionAtFn(x : number, y : number) : HeatmapRegion {
      return {
        x,
        y,
        coords: () => [x,y],
        score: heatmap[x] && typeof heatmap[x][y] === 'number'
          ? heatmap[x][y]
          : null
      };
    },
    function getRegionAtResolver(x, y){
      return `${x},${y}`;
    }
  );

  function isEdge(p : HeatmapRegion) : boolean {
    // if this pixel is not empty and it has at least one empty neighbor 
    return !!p.score && !!adjacentNeighborsOffsets.find(([dx,dy]) => {
      const n = getRegionAt(p.x+dx, p.y+dy);
      return !n.score;
    });
  }

  function getAdjacentNeighbors() : HeatmapRegion[] {
    return adjacentNeighborsOffsets.map(([dx, dy]) => getRegionAt(c+dx, r+dy));
  }

  // try to get groups of contiguous pixels from an arbitrary array of pixels
	// TODO: might not need this function anymore
  function getContiguousRegions(regions: HeatmapRegion[]) : HeatmapRegion[][] {
    return regions.reduce(
      (acc, v, i, arr) => {        
        const group = [];
        function hasBeenUsed(p : HeatmapRegion) : boolean {
          // flatten all
          return !!acc.reduce(
            (_acc, v) => {
              _acc = _acc.concat(v);
              return _acc;
            },
            []
          )
          .find(_v => isSameHeatmapRegion(_v, p))
        };

        function getAdjacents(v){
          return arr.filter(p => (p.x === v.x && Math.abs(p.y - v.y) === 1) || (p.y === v.y && Math.abs(p.x - v.x) === 1));
        };

        function iterate(item){
          if(!hasBeenUsed(item)){
            group.push(item);
            for(const adjacent of getAdjacents(item)){
              iterate(adjacent)
            }            
          }
        };
        iterate(v);

        if(group.length){
          acc.push(group);
        }
        return acc;
      },
      []
    );
  }

  // this function determines a vertex for a given heatmap region and its neighbor
  // and returns the verteces that 
  function getContourVertex(region: HeatmapRegion, emptyNeighbor: HeatmapRegion) : ContourVertex[] {
    // const edges = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const dx = emptyNeighbor.x - region.x;
    const dy = emptyNeighbor.y - region.y;
  }

  while(r < height && c < width){
    let p : HeatmapRegion = getRegionAt(c, r);
		
    if(isEdge(p)){
      // found edge pixel, start creating a contour object
			const first = p;
      const contour = [];

			let i = 0;

			function getSharedVerticesForEmptyNeighbor(emptyNeighbor : HeatmapRegion, filter) : ContourVertex[] {
				const diffVec = vectorDifference(emptyNeighbor.coords(), p.coords());
				const [regionsVertices, emptyRegionVertices] = [p, emptyNeighbor]
					.map(
						region => edgeOffsets.map(([dx, dy]) => [region.x + dy, region.y + dy])
					);
				
				const contourVertices = [];
				// loop through all the corners of the current region 
				// and see if they match any corners in the empty region
				for(const [rx, ry] of regionsVertices){
					let matchingVertex = emptyRegionVertices.find(([ex, ey]) => ex === rx && ey === ry);
					if(matchingVertex){
						contourVertices.push(matchingVertex);
					}

					if(contourVertices.length > 1){
						break;
					}
				}
				return contourVertices;
			}

			while(p && isEdge(p)){
				if(!contour.length){
					
				}
				else if(p === first) {
					// we are back at the first edge region 
					// make sure all vertices are accounted for
				}




				// reset p
				i += 1;
				p = getAdjacentNeighbors;
			}

      /* 
      * start by creating the first two points by getting an empty neighbor
      */
      let availableEmptyNeighbors = getAdjacentNeighbors().filter(region => !region.score);
      let emptyNeighbor : HeatmapRegion = availableEmptyNeighbors[0];
      let emptyNeighborOffsets : [number, number] = null;

      let i = 0;
			// find an adjacent neighbor
      for(const [dx, dy] of adjacentNeighborsOffsets){
        const region = getRegionAt(c+dx, r+dy);
        if(region && !region.score && !(region.contour === contour)){
          emptyNeighborOffsets = [dx, dy];
          emptyNeighbor = region;
          break;
        };
        i += 1;
      };

      const initialPoints = edgeOffsets.concat(edgeOffsets).slice(i, i+2);
      const diffVec = vectorDifference(p.coords(), emptyNeighbor.coords());

      for(const initialPoint of initialPoints){
        contour.push(
          initialPoint[0] + diffVec[0] * (1 - p.score),
          initialPoint[1] + diffVec[1] * (1 - p.score)
        );
      }

      // remove this empty neighbor now that it has been used
      function removeEmptyNeighbor(){
        availableEmptyNeighbors.splice(availableEmptyNeighbors.indexOf(emptyNeighbor));
      }
      removeEmptyNeighbor();

      /* 
      * now start tracing, finding the next empty neighbor 
      * that is adjacent (or if not adjacent, diagonal) to the current empty neighbor (emptyNeighbor)
      * if, none is found, try to find the next adjacent edge heatmap item (p)
      */

      function getNextNearestEmptyNeighbor() : HeatmapRegion {
        const lastContour = contours[contours.length-1];
        // try to find a neighbor that is touch
        return availableEmptyNeighbors.find(
          e => {
            for(const [dx, dy] of edgeOffsets){
              if(glVec2.dist([e.x + dx, e.y + dy], lastContour) < 1){
                return true;
              }
            }
          }
        );
      }

      while(true){
        // see if there's another empty neighbor that's touching our current empty neighbor
        emptyNeighbor = getNextNearestEmptyNeighbor();
        if(!emptyNeighbor){
          // move to the next edge region
        }
				else {

				}
				availableEmptyNeighbors.splice(availableEmptyNeighbors.indexOf(emptyNeighbor));
        break;
      }

      do {
        if(contour.length){

        }
        // look through neighbors to find one that is an edge and hasn't been used yet        
        pNext = neighborOffsets.find(([dx, dy]) => {
          const _p = getRegionAt(c+dx, c+dy);
          return _p && !_p.isUsedInContour && isEdge(_p);
        });
        if(pNext){
          // continue building contour          
          pNext.isContour = true;
        }
      } while(pNext);
      contours.push(contour);
    }

    // iterate
    c += 1;
    if(c >= width){
      c = 0;
      r += 1;
    }
  }
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