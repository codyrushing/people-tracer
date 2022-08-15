import { atom, selector, RecoilState } from 'recoil';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { InferenceEngine } from '../tracer-engine/inference';

export async function loadObjectDetectionModel(modelConfig? : cocoSsd.ModelConfig) : Promise<cocoSsd.ObjectDetection> {
  const model = await cocoSsd.load(modelConfig);
  return model;
}

export const availableModels : cocoSsd.ObjectDetectionBaseModel[] = ['lite_mobilenet_v2', 'mobilenet_v2', 'mobilenet_v1'];
export const objectDetectionBase = atom({
  key: 'objectDetectionBase',
  default: availableModels[0]
});

export const availableCameras = selector({
  key: 'availableCameras',
  async get(){
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(({kind}) => kind === 'videoinput');
  }
});

export const selectedVideoFile = atom({
  'key': 'selectedVideoFile',
  default: null
});

export const selectedCamera = atom({
  key: 'selectedCamera',
  default: null
});

export const availableVideoSourceTypes = ['camera', 'file'];
export const videoSourceType = atom({
  key: 'videoSourceType',
  default: availableVideoSourceTypes[0]
});

export const inputHTMLVideoElement = atom({
  key: 'inputHTMLVideoElement',
  default: null
});

export const inferenceEngine : RecoilState<InferenceEngine> = atom({
  key: 'inferenceEngine',
  default: null
})

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