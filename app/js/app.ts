import '../styles/app.less';
import * as PIXI from 'pixi.js';
import './lib/websocket';
import { initProgramStageManager } from './stages';
import { initViewportManager } from './utils/viewport';

export const container : HTMLCanvasElement = document.querySelector('canvas#canvas');

export function getContainer() : HTMLCanvasElement {
  return container;
}

export const app = new PIXI.Application({  
  width: window.innerWidth,
  height: window.innerHeight,
  view: container
});

initViewportManager();
initProgramStageManager();
