import { useRecoilValue, useRecoilState } from 'recoil';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as STATE from '../lib/state';
import { useEffect } from 'react';

export interface InferenceEngineOptions {
  multiperson: boolean;
  objectDetectionBase: cocoSsd.ObjectDetectionBaseModel;
  objectDetectionScoreThreshold?: number,
  inputHTMLVideoElement: HTMLVideoElement;
  boundingBoxContainer?: HTMLElement;
  onInferenceCallback?: (inference) => void;  
}

export interface InferenceEngine {
  update: (options:InferenceEngineOptions) => void;
  run: () => Promise<void>;
  start: () => void;
  stop: () => void;
}

export function generateInferenceEngine(options:InferenceEngineOptions) : InferenceEngine {  
  let objectDetectionModel : cocoSsd.ObjectDetection | undefined;
  let stopped = false;
  let boundingBoxElements : HTMLCanvasElement[] = [];
  const boundingBoxClassName = 'person';
  
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
    boundingBoxElements = Array.from(boundingBoxContainer.querySelectorAll(`.${boundingBoxClassName}`));

    for(let [i, detectedPerson] of detectedPeople.entries()){
      let [x, y, width, height] = detectedPerson.bbox;
      let canvasElement = boundingBoxElements[i] || (function(){
        let canvas = document.createElement('canvas');
        canvas.setAttribute('class', boundingBoxClassName);
        return boundingBoxContainer.appendChild(canvas);
      })();
      let context = canvasElement.getContext('2d');
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasElement.width = width;
      canvasElement.height = height;
      canvasElement.style.position = 'absolute';
      canvasElement.style.top = `${y}px`;
      canvasElement.style.left = `${x}px`;

      // canvasElement.style.width = `${width}px`;
      // canvasElement.style.height = `${height}px`;

      canvasElement.style.border = '1px solid red';
      canvasElement.getContext('2d').drawImage(
        inputHTMLVideoElement,
        x, y, width, height,
        0, 0, width, height
      );
    }

    // cleanup elements no longer needed
    for(let i=detectedPeople.length; i<boundingBoxElements.length; i++){
      boundingBoxContainer.removeChild(boundingBoxElements[i]);
      boundingBoxElements.slice(i, 1);
    }

    // TODO, this function should take the list of detected people
    // and create a canvas element for each, and perform a crop against
    // the video element https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    // as well as remove any canvases that are no longer present
  }

  async function run(){
    try {
      const { 
        inputHTMLVideoElement, 
        onInferenceCallback,
        objectDetectionScoreThreshold=0.2
      } = options;
      if(!objectDetectionModel){
        await loadModel();
      }
      const detectedThings : cocoSsd.DetectedObject[] = await objectDetectionModel.detect(inputHTMLVideoElement, 20, objectDetectionScoreThreshold);
      const detectedPeople = detectedThings.filter((o) => o.class === 'person');
      if(typeof onInferenceCallback === 'function'){
        onInferenceCallback(detectedPeople);
      }
      getBoundingBoxElements(detectedPeople);
    }
    catch(err:any){
      console.error(err);
    }
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
  const objectDetectionScoreThreshold = useRecoilValue(STATE.objectDetectionScoreThreshold);
  const inputHTMLVideoElement = useRecoilValue(STATE.inputHTMLVideoElement);
  const [inferenceEngine, setInferenceEngine] = useRecoilState(STATE.inferenceEngine);

  function onInferenceCallback(inference){
    // console.log(inference);
    // TODO, this should take data from the inference engine
    // and report it in the UI
  }

  useEffect(
    () => {
      const inferenceEngineOptions : InferenceEngineOptions = {
        multiperson: true,
        objectDetectionBase,
        objectDetectionScoreThreshold,
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
    [inputHTMLVideoElement, objectDetectionBase, objectDetectionScoreThreshold]
  );

  return inferenceEngine;
}