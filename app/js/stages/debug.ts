import * as PIXI from 'pixi.js';
import { app } from '../app';
import eventEmitter from '../lib/event-emitter';
import { Frame, PersonGroup } from '../../../util/trace';

const FRAMERATE_CONTAINER_NAME = 'frameRateContainer';
const MAIN_CONTAINER_NAME = 'mainContainer';

interface PersonGroupRenderData {
  personGroup: PersonGroup;
  frame: Frame;
  container: PIXI.Container;
  isEntering?: boolean;
  isExiting?: boolean;
}

let frames : Frame[] = [];
let allRenderData : PersonGroupRenderData[] = [];
function getContainerNameForPersonGroup(personGroup : PersonGroup){
  return `persongroup_${personGroup.id}`;
}

// the purpose of this function is to update allRenderData
function onDebugFrame(frame) : PersonGroupRenderData[] {
  frames.unshift(frame);
  frames = frames.slice(0,5);

  // remove any that were previously exiting
  allRenderData = allRenderData.filter(({isExiting}) => !isExiting);

  // set all previous items to exiting
  // if they are not exiting, this will be set to false in the next step
  for(const renderData of allRenderData){
    renderData.isEntering = false;
    renderData.isExiting = true;
  }

  // iterate through all personGroups
  for(const personGroup of frame.personGroups){
    // find matching group by id
    let renderData = allRenderData.find(({personGroup:pg}) => pg.id === personGroup.id);
    let renderUpdate : any = {
      personGroup,
      frame,
      isExiting: false
    };
    if(!renderData){
      let container = new PIXI.Container();
      container.name = getContainerNameForPersonGroup(personGroup);
      renderData = {
        ...renderUpdate,
        container,
        isEntering: true
      }
      // add to allRenderData
      allRenderData.push(renderData);
    }
    else {
      // apply updates
      Object.assign(renderData, renderUpdate);
    }
  }
  return allRenderData;
}

const waitingText = new PIXI.Text('Waiting for frames...', new PIXI.TextStyle({
  fontFamily: 'monospace',
  fill: '#ffffff'
}));

async function init(){
  eventEmitter.on('frame', onDebugFrame);
  const frameRateContainer = new PIXI.Container();
  frameRateContainer.name = FRAMERATE_CONTAINER_NAME;  
  app.stage.addChild(frameRateContainer);
  const peopleContainer = new PIXI.Container();
  peopleContainer.name = MAIN_CONTAINER_NAME;
  app.stage.addChild(peopleContainer);
  run();
}

async function destroy(){
  //
  // eventEmitter.off('frame', onDebugFrame);
  // console.log('destroy');
}

async function run(){
  let renderSeconds = [];
  app.ticker.add(
    function onDebugRender(seconds) {
      renderSeconds.unshift(seconds);
      renderSeconds = renderSeconds.slice(0, 5);
      const { offsetWidth: width, offsetHeight: height } = app.view;
      const fontSize = Math.round(width / 25);

      if(!frames.length){        
        waitingText.style.fontSize = `${fontSize}px`;
        waitingText.x = fontSize;
        waitingText.y = fontSize;
        app.stage.addChild(waitingText);
        return;
      }      

      app.stage.removeChild(waitingText);

      // render things
      for(const personGroupRenderData of allRenderData){
        const { personGroup, container, isExiting } = personGroupRenderData;
        const g = new PIXI.Graphics();
        g.closePath();

        app.stage.removeChild(container);
        container.removeChildren();

        if(isExiting){
          continue;
        }

        // set a fill and line style
        g.beginFill(0xFF3300);
        g.lineStyle(2, 0xffd900, 1);

        let i = 0;
        for(const [x,y] of personGroup.contour.slice(0, personGroup.contour.length-6)){
          if(i === 0){
            g.moveTo(x * width, y * height);
          }
          g.lineTo(x * width, y * height);
          i++;
        }

        // draw a shape
        g.closePath();
        g.endFill();

        container.addChild(g);
        app.stage.addChild(container);
      }


    }
  );
}

export default {
  name: 'debug',
  init,
  destroy,
  run
};