import { atom, selector, selectorFamily } from 'recoil';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export async function loadObjectDetectionModel(modelConfig? : cocoSsd.ModelConfig) : Promise<cocoSsd.ObjectDetection> {
  const model = await cocoSsd.load(modelConfig);
  return model;
}

export const availableModels = ['lite_mobilenet_v2', 'mobilenet_v2', 'mobilenet_v1'];
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

// export const selectedCamera = selectorFamily({
//   key: 'selectedCamera',
//   get: deviceId => ({get}) => {
//     const cameras = get(availableCameras);
//     return deviceId
//       ? cameras.find(camera => camera.deviceId === deviceId)
//       : cameras[0];
//   },
// });

export const selectedCamera = atom({
  key: 'selectedCamera',
  default: null
});

export const availableVideoSources = ['camera', 'file'];
export const videoSource = atom({
  key: 'videoSource',
  default: availableVideoSources[0]
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