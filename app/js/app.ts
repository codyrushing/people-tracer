import * as PIXI from 'pixi.js';
import './lib/websocket';
import { initProgramStageManager } from './stages';

const container : HTMLCanvasElement = document.querySelector('canvas#canvas');

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  view: container
});

export function getContainer(){
  return container;
}

initProgramStageManager();
app;
