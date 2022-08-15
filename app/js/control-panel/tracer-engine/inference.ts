import { useRecoilValue, useRecoilState } from 'recoil';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as STATE from '../lib/state';
import { useEffect } from 'react';

export interface InferenceEngineOptions {
  multiperson: boolean;
  objectDetectionBase: cocoSsd.ObjectDetectionBaseModel;
  inputHTMLVideoElement: HTMLVideoElement;
  boundingBoxContainer?: HTMLElement;
  onInferenceCallback: (inference) => void;  
}

export interface InferenceEngine {
  update: (options:InferenceEngineOptions) => void;
  run: () => Promise<void>;
  start: () => void;
  stop: () => void;
}

export function generateInferenceEngine(options:InferenceEngineOptions) : InferenceEngine {  
  let objectDetectionModel;
  let stopped = false;
  
  async function loadModel(){
    // TODO, this requires loading a model. Modify to use a local copy
    const { objectDetectionBase } = options;
    objectDetectionModel = await cocoSsd.load({
      base: objectDetectionBase
    });  
  }

  function onOptionChanged(name:string, value:any){
    switch(name){
      case 'objectDetectionBase':
        loadModel();
        break;
    }
  }

  function update(opts){
    options = {
      ...options,
      ...opts
    };

    for(const [k, v] of Object.entries(opts)){
      if(v !== options[k]){
        onOptionChanged(k, v);
      }
    }
  }

  function getBoundingBoxElements(detectedPeople : cocoSsd.DetectedObject[]){
    const { inputHTMLVideoElement } = options;
    const boundingBoxContainer = inputHTMLVideoElement.parentElement;
    // TODO, this function should take the list of detected people
    // and create a canvas element for each, and perform a crop against
    // the video element https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    // as well as remove any canvases that are no longer presetn
  }

  async function run(){
    const { 
      inputHTMLVideoElement, 
      onInferenceCallback,
    } = options;
    if(!objectDetectionModel){
      await loadModel();
    }
    const detectedThings : cocoSsd.DetectedObject[] = await objectDetectionModel.detect(inputHTMLVideoElement);
    const detectedPeople = detectedThings.filter((o) => o.class === 'person');
    onInferenceCallback(detectedPeople);
    getBoundingBoxElements(detectedPeople);

    if(!stopped){
      window.requestAnimationFrame(run);
    }
  }

  function stop(){
    stopped = true;
  }

  function start(){
    stopped = false;
    run();
  }
  
  return {
    update,
    run,
    start,
    stop
  };

}

export function useInferenceEngine(){
  const objectDetectionBase = useRecoilValue(STATE.objectDetectionBase);
  const inputHTMLVideoElement = useRecoilValue(STATE.inputHTMLVideoElement);
  const [inferenceEngine, setInferenceEngine] = useRecoilState(STATE.inferenceEngine);

  function onInferenceCallback(inference){
    console.log(inference);
    // TODO, this should take data from the inference engine
    // and report it in the UI
  }

  useEffect(
    () => {
      const inferenceEngineOptions : InferenceEngineOptions = {
        multiperson: true,
        objectDetectionBase,
        inputHTMLVideoElement,
        onInferenceCallback
      };      
      const engine = inferenceEngine ||  generateInferenceEngine(inferenceEngineOptions);
      engine.update(inferenceEngineOptions);
      if(inputHTMLVideoElement){
        inputHTMLVideoElement.addEventListener('loadeddata', function onVideoLoaded(){
          engine.run();
        });
      }
      setInferenceEngine(engine);
    },
    [inputHTMLVideoElement, objectDetectionBase]
  );

  return inferenceEngine;
}