import * as PIXI from 'pixi.js';
import { app } from '../app';

async function init(){
  run();
}

async function destroy(){
  //
  console.log('destroy');
}

async function run(){
  const basicText = new PIXI.Text('Waiting for frames...', new PIXI.TextStyle({
    fontFamily: 'monospace',
    fill: '#ffffff'
  }));

  basicText.x = 50;
  basicText.y = 50;
  
  app.stage.addChild(basicText);
}

export default {
  name: 'debug',
  init,
  destroy,
  run
};