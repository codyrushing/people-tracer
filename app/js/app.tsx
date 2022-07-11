import '../styles/controller.less';
import ReactDOM from 'react-dom/client';
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

const Page = function(){
  return <div>
    <h1>Page</h1>
  </div>;
}

const container = document.querySelector('#controller-app-wrapper');
if(container){
  const root = ReactDOM.createRoot(container);
  root.render(<Page />);
}

async function run(){
  await TracerEngine();
}

run()
  .catch(
    err => {
      console.error(err);
    }
  )