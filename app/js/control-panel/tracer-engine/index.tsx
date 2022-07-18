import { MutableRefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { engineMode, objectDetectionBase } from '../state';

// export async function _TracerEngine(){
//   const model = await cocoSsd.load();
//   const aspectRatio = 16/9;
//   const video : HTMLVideoElement = document.querySelector('video#input-video');
//   const stream = await navigator.mediaDevices.getUserMedia({ 
//     video: {
//       width: 1280, 
//       height: 720, 
//       facingMode: 'user'
//     }, 
//     audio: false 
//   });

//   video.srcObject = stream;
//   video.play();

//   let streaming;
//   video.addEventListener('canplay', function(ev){
//     if (!streaming) {
//       // video.setAttribute('width', width.toString());
//       // video.setAttribute('height', height.toString());
//       streaming = true;
//     }
//   }, false);
// }

// export async function (video:HTMLVideoElement){

// }

export function TracerEngineVideo() : JSX.Element {
  const videoElement : MutableRefObject<HTMLVideoElement> = useRef();
  const [streaming, setStreaming] = useState(false);

  async function useCamera(video:HTMLVideoElement) : Promise<HTMLVideoElement> {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: 1280, 
        height: 720, 
        facingMode: 'user'
      }, 
      audio: false 
    });
    video.srcObject = stream;
    video.play();  
  
    video.addEventListener('canplay', function onCanPlay(){
      if (!streaming) {
        setStreaming(true);
        video.removeEventListener('canplay', onCanPlay);
      }
    }, false);
    return video;
  };

  useLayoutEffect(
    () => {
      if(videoElement.current){
        useCamera(videoElement.current);        
      }
    },
    []
  );

  useEffect(
    () => {
      if(streaming){
        //
      }
    },
    [streaming]
  );

  return <div className="flex">    
    <video className="input-video" ref={videoElement}></video>
  </div>;
};

export function ObjectDetectionBase() : JSX.Element {
  const [mode, setMode] = useRecoilState(objectDetectionBase);

  function onChange({target: {value}}){
    setMode(value);
  }

  const modes = ['lite_mobilenet_v2', 'mobilenet_v2', 'mobilenet_v1']

  return <div className="tracer-engine-options">
    <select onChange={onChange} defaultValue={mode}>
      {
        modes.map(
          m => <option key={m} value={m}>{m}</option>
        )
      }
    </select>
  </div>
}

export function TracerEngineOptions() : JSX.Element {
  const [mode, setMode] = useRecoilState(objectDetectionBase);

  function onChange({target: {value}}){
    setMode(value);
  }

  const modes = ['lite_mobilenet_v2', 'mobilenet_v2', 'mobilenet_v1']

  return <div className="tracer-engine-options">
    <ObjectDetectionBase />
  </div>
}

export default function TracerEngine() : JSX.Element {
  return <section className="tracer-engine">
    <TracerEngineOptions />
    <TracerEngineVideo />
  </section>
};