import { MutableRefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
// import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  availableCameras, 
  objectDetectionBase,
  availableModels,
  videoSourceType,
  availableVideoSourceTypes,
  selectedCamera,
  selectedVideoFile,
  inputVideoElement
} from '../state';

export function TracerEngineVideo() : JSX.Element {
  const sourceType = useRecoilValue(videoSourceType);
  const videoElement : MutableRefObject<HTMLVideoElement> = useRef();
  const [streaming, setStreaming] = useState(false);
  const camera = useRecoilValue(selectedCamera);
  const [_, setInputVideoElement] = useRecoilState(inputVideoElement);
  const videoFile = useRecoilValue(selectedVideoFile);

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
        setInputVideoElement(videoElement.current);
      }
    },
    []
  );

  useLayoutEffect(
    () => {
      if(videoElement.current){
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

  return <div className="flex">
    <video controls muted loop className="input-video" ref={videoElement}></video>
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

export function SourceTypeSelect() : JSX.Element {
  const [sourceType, setSourceType] = useRecoilState(videoSourceType);

  function onChange({target: { value }}){
    setSourceType(value);
  }

  return <div className="source-selector">
    <label className="block">Source type:</label>
    <select onChange={onChange} defaultValue={sourceType}>
      {
        availableVideoSourceTypes.map(
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
  const [_, setSelectedVideoFile] = useRecoilState(selectedVideoFile);
  function onChange(e){
    if(e.target?.files?.length){
      setSelectedVideoFile(e.target.files[0]);
    }
  };
  return <div className="file-selector">
    <input onChange={onChange} type="file" accept="video/*" />
  </div>;
}

export function InputVideoSelect() : JSX.Element {
  const sourceType = useRecoilValue(videoSourceType);

  const input = sourceType === 'file'
    ? <InputFileSelect />
    : <InputCameraSelect />;

  return <div className="input-source-selector">
    <label className="block">Input source:</label>
    {input}
  </div>
}

export function TracerEngineOptions() : JSX.Element {
  return <div className="tracer-engine-options flex gap-4">
    <SourceTypeSelect />
    <InputVideoSelect />
    <ObjectDetectionBase /> 
  </div>
}

export default function InputVideoSettings() : JSX.Element {
  return <section className="tracer-engine flex flex-col gap-6 mt-6">
    <TracerEngineOptions />
    <TracerEngineVideo />
  </section>
};