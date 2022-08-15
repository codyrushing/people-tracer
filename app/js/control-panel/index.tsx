// import React from 'react';
import '../../styles/controller.css';
import ReactDOM from 'react-dom/client';
import { RecoilRoot } from 'recoil';
// import * as PIXI from 'pixi.js';
// import './lib/websocket';
import TracerEngine from './tracer-engine';
// import { initProgramStageManager } from './stages';
// import { initViewportManager } from './utils/viewport';

// export const container : HTMLCanvasElement = document.querySelector('canvas#canvas');

// export function getContainer() : HTMLCanvasElement {
//   return container;
// }

// export const app = new PIXI.Application({  
//   width: window.innerWidth,
//   height: window.innerHeight,
//   view: container
// });

// initViewportManager();
// initProgramStageManager();

export function ControlPanelPage() : JSX.Element {
  return <RecoilRoot>
    <div className="control-panel-page py-5 max-w-7xl mx-auto text-slate-200 font-mono">
      <h1>Control Panel</h1>
      <TracerEngine />      
    </div>    
  </RecoilRoot>;
}

const container = document.querySelector('#controller-app-wrapper');
if(container){
  const root = ReactDOM.createRoot(container);
  root.render(<ControlPanelPage />);
}