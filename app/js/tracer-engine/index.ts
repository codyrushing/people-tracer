// import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';

import * as cocoSsd from '@tensorflow-models/coco-ssd';


export default async function TracerEngine(){
  const model = await cocoSsd.load();
  console.log(model);
  const aspectRatio = 16/9;
  const video : HTMLVideoElement = document.querySelector('video#input-video');
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

  let streaming;
  video.addEventListener('canplay', function(ev){
    if (!streaming) {
      // video.setAttribute('width', width.toString());
      // video.setAttribute('height', height.toString());
      streaming = true;
    }
  }, false);

}