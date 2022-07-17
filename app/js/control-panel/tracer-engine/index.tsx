// import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import { useLayoutEffect, useRef } from 'react';

import * as cocoSsd from '@tensorflow-models/coco-ssd';

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

export default function TracerEngine(){
  const videoElement = useRef();

  async function useCamera(){
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: 1280, 
        height: 720, 
        facingMode: 'user'
      }, 
      audio: false 
    });
    if(videoElement.current){
      videoElement.current.srcObject = stream;
      videoElement.current.play();  
    }
  }

  useLayoutEffect(
    () => {
      useCamera();
    },
    []
  );

  return <div className="flex">    
    <video className="input" ref={videoElement}></video>
  </div>;
}