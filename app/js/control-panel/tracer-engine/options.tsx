import { useEffect } from 'react';
import { useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil';
import * as STATE from '../lib/state';

export function ObjectDetectionBase() : JSX.Element {
  const [mode, setMode] = useRecoilState(STATE.objectDetectionBase);

  function onChange({target: {value}}){
    setMode(value);
  }

  return <div className="tracer-engine-options">
    <label className="block">Object detection model:</label>
    <select onChange={onChange} defaultValue={mode}>
      {
        STATE.availableModels.map(
          m => <option key={m} value={m}>{m}</option>
        )
      }
    </select>
  </div>
}

export function SourceTypeSelect() : JSX.Element {
  const [sourceType, setSourceType] = useRecoilState(STATE.videoSourceType);

  function onChange({target: { value }}){
    setSourceType(value);
  }

  return <div className="source-selector">
    <label className="block">Source type:</label>
    <select onChange={onChange} defaultValue={sourceType}>
      {
        STATE.availableVideoSourceTypes.map(
          videoSource => <option key={videoSource} value={videoSource}>{videoSource}</option>
        )
      }
    </select>
  </div>
}

export function InputCameraSelect() : JSX.Element {
  const { contents : availableCameraInputs, state } = useRecoilValueLoadable(STATE.availableCameras);
  const [camera, setCamera] = useRecoilState(STATE.selectedCamera);
  
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

  if(state === 'loading'){
    return null;
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
  const [_, setSelectedVideoFile] = useRecoilState(STATE.selectedVideoFile);
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
  const sourceType = useRecoilValue(STATE.videoSourceType);

  const input = sourceType === 'file'
    ? <InputFileSelect />
    : <InputCameraSelect />;

  return <div className="input-source-selector">
    <label className="block">Input source:</label>
    {input}
  </div>
}

export function ObjectDetectionScoreThreshold(){
  const [objectDetectionScoreThreshold, setObjectDetectionScoreThreshold] = useRecoilState(STATE.objectDetectionScoreThreshold);

  function onChange(e){
    setObjectDetectionScoreThreshold(e.target.value);
  }

  return <div>
    <label className="block">Score threshold:</label>
    <div className="flex">
      <input 
        type="range" 
        min={0.0} 
        max={1.0}
        step={0.05} 
        onChange={onChange}
        defaultValue={objectDetectionScoreThreshold} />
      <div>{objectDetectionScoreThreshold}</div>
    </div>
  </div>
}

export default function TracerEngineOptions() : JSX.Element {
  return <div className="tracer-engine-options flex gap-4">
    <SourceTypeSelect />
    <InputVideoSelect />
    <ObjectDetectionBase /> 
    <ObjectDetectionScoreThreshold />
  </div>
}
