import { MutableRefObject, useLayoutEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

import * as STATE from '../lib/state';

export default function TracerEngineInputVideo() : JSX.Element {
  const sourceType = useRecoilValue(STATE.videoSourceType);
  const videoElement : MutableRefObject<HTMLVideoElement> = useRef();
  const [streaming, setStreaming] = useState(false);
  const camera = useRecoilValue(STATE.selectedCamera);
  const videoFile = useRecoilValue(STATE.selectedVideoFile);
  const [_inputHTMLVideoElement, setinputHTMLVideoElement] = useRecoilState(STATE.inputHTMLVideoElement)

  async function useCamera(video:HTMLVideoElement) : Promise<HTMLVideoElement> {
    if(camera){
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: 1280, 
          height: 720,
          deviceId: camera.deviceId
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
    }
  };

  function useVideoFile(video:HTMLVideoElement) : HTMLVideoElement {
    if(videoFile){
      video.srcObject = null;
      video.src = window.URL.createObjectURL(videoFile);
      video.play();  
    }
    return video;
  }

  useLayoutEffect(
    () => {
      if(videoElement.current){
        setinputHTMLVideoElement(videoElement.current);
        if(sourceType === 'camera'){
          useCamera(videoElement.current);
        }
        else if (sourceType === 'file'){
          useVideoFile(videoElement.current);
        }
      }
    },
    [camera, videoFile, sourceType]
  );

  return <div className="flex relative">
    <video controls muted loop className="input-video" ref={videoElement}></video>
  </div>;
};