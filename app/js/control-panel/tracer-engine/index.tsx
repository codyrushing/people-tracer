import { MutableRefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
// import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  availableCameras, 
  objectDetectionBase,
  availableModels,
  videoSource,
  availableVideoSources,
  selectedCamera
} from '../state';

export function TracerEngineVideo() : JSX.Element {
  const videoElement : MutableRefObject<HTMLVideoElement> = useRef();
  const [streaming, setStreaming] = useState(false);
  const camera = useRecoilValue(selectedCamera);

  async function useCamera(video:HTMLVideoElement) : Promise<HTMLVideoElement> {
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
  };

  useLayoutEffect(
    () => {
      if(videoElement.current){
        useCamera(videoElement.current);        
      }
    },
    [camera]
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

  return <div className="tracer-engine-options">
    <label className="block">Object detection model:</label>
    <select onChange={onChange} defaultValue={mode}>
      {
        availableModels.map(
          m => <option key={m} value={m}>{m}</option>
        )
      }
    </select>
  </div>
}

export function SourceSelect() : JSX.Element {
  const [source, setSource] = useRecoilState(videoSource);

  function onChange({target: { value }}){
    setSource(value);
  }

  return <div className="source-selector">
    <label className="block">Source:</label>
    <select onChange={onChange} defaultValue={source}>
      {
        availableVideoSources.map(
          videoSource => <option key={videoSource} value={videoSource}>{videoSource}</option>
        )
      }
    </select>
  </div>
}

export function InputCameraSelect() : JSX.Element {
  const availableCameraInputs = useRecoilValue(availableCameras);
  const [camera, setCamera] = useRecoilState(selectedCamera);
  
  useEffect(
    () => {
      if(availableCameraInputs.length && !camera){
        setCamera(availableCameraInputs[0])
      }
    },
    [availableCameraInputs]
  )

  function onChange({target: { value }}){
    setCamera(availableCameraInputs.find(camera => camera.deviceId === value))
  }

  if(!camera){
    return <p>No camera found</p>
  }

  return <div className="camera-selector">
    <label className="block">Camera input:</label>
    <select onChange={onChange} defaultValue={camera.deviceId}>
      {
        availableCameraInputs.map(
          availableCamera => <option key={availableCamera.deviceId} value={availableCamera.deviceId}>{availableCamera.label}</option>
        )
      }
    </select>
  </div>
}

export function InputFileSelect() : JSX.Element {
  return <p>File select goes here</p>
}

export function InputSelect() : JSX.Element {
  const [source] = useRecoilState(videoSource);

  if(source === 'file'){
    return <InputFileSelect />
  }

  return <InputCameraSelect />
}

export function TracerEngineOptions() : JSX.Element {
  return <div className="tracer-engine-options flex gap-4">
    <SourceSelect />
    <InputSelect />
    <ObjectDetectionBase /> 
  </div>
}

export default function TracerEngine() : JSX.Element {
  return <section className="tracer-engine">
    <TracerEngineOptions />
    <TracerEngineVideo />
  </section>
};