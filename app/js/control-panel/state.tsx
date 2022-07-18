import { atom, selector } from 'recoil';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export async function loadObjectDetectionModel(modelConfig? : cocoSsd.ModelConfig) : Promise<cocoSsd.ObjectDetection> {
  const model = await cocoSsd.load(modelConfig);
  return model;
}

export const objectDetectionBase = atom({
  key: 'objectDetectionBase',
  default: 'lite_mobilenet_v2'
});

// export function getObjectDetectionModel(config:coco.ModelConfig){
//   return atom({
//     key: 'objectDetectionModel',
//     default: null,
//     get: ()=>{

//     }
//   })
// }

// export const objectDetectionModel = atom({
//   key: 'object'
// })