import * as PIXI from 'pixi.js';
import { app } from '../app';
import eventEmitter from '../lib/event-emitter';
import { Frame, PersonGroup } from '../../../util/trace';
import simplify from 'simplify-path';

const FRAMERATE_CONTAINER_NAME = 'frameRateContainer';
const MAIN_CONTAINER_NAME = 'mainContainer';

interface RenderableItemMeta {
  frame: Frame;
  container?: PIXI.Container;
  isEntering?: boolean;
  isExiting?: boolean;
}

interface RenderableItem {
  personGroup: PersonGroup;
  meta: RenderableItemMeta;
}

interface RenderState {
  frames: Frame[];
  items: RenderableItem[];
}

interface RenderStateUpdate {
  frames?: Frame[];
  items?: RenderableItem[];
}

function getContainerNameForPersonGroup(personGroup : PersonGroup){
  return `persongroup_${personGroup.id}`;
}

function renderStateFactory(frames: Frame[] = [], items: RenderableItem[] = []) : [() => RenderState, (r:RenderStateUpdate) => RenderState] {
  let currentRenderState : RenderState = {
    frames,
    items
  };

  return [
    function _getRenderState() : RenderState {
      return currentRenderState;
    },    
    function _setRenderState({frames, items}) : RenderState {
      if(frames){
        currentRenderState.frames = frames;
      }
      if(items){
        currentRenderState.items = items;
      }
      return currentRenderState;
    }
  ]
}

const [getRenderState, setRenderState] = renderStateFactory();

function onDebugFrame(frame:Frame) : RenderState {
  let { frames, items } = getRenderState();

  frames.unshift(frame);
  frames = frames.slice(0,5);

  // remove any that were previously exiting
  // TODO remove the pixi container from here
  items = items.filter(({meta}) => {
    const stillExists = !meta?.isExiting;
    if(!stillExists && meta?.container?.parent){
      let containerIndex = meta.container.parent.getChildIndex(meta.container);
      if(typeof containerIndex === 'number'){
        meta.container.parent.removeChildAt(containerIndex);
      }
    }
    return stillExists;
  });

  // set all previous items to exiting
  // if they are not exiting, this will be set to false in the next step
  for(const item of items){
    item.meta.isEntering = false;
    item.meta.isExiting = true;
  }

  // iterate through all personGroups, and insert/update the renderable item in the RenderState
  for(const personGroup of frame.personGroups){
    // find matching renderableItem by id
    let renderableItem = items.find(({personGroup:pg}) => pg.id === personGroup.id);    
    let meta : RenderableItemMeta = {
      frame,
      isEntering: false,
      isExiting: false
    };
    // insert new item
    if(!renderableItem){
      let container = new PIXI.Container();
      container.name = getContainerNameForPersonGroup(personGroup);
      renderableItem = {
        personGroup,
        meta: {
          ...meta,
          container,
          isEntering: true
        }
      }
      // add to allRenderData
      items.push(renderableItem);
    }
    // update existingItem
    else {
      // apply updates
      renderableItem.personGroup = personGroup;
      Object.assign(renderableItem.meta, meta);
    }    
  }

  return setRenderState({items});
}

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
  eventEmitter.off('frame', onDebugFrame);
  console.log('destroy');
}

async function run(){
  let renderSeconds = [];

  const waitingText = new PIXI.Text('Waiting for frames...', new PIXI.TextStyle({
    fontFamily: 'monospace',
    fill: '#ffffff'
  }));

  app.ticker.add(
    function onDebugRender(seconds) {
      const { frames, items } = getRenderState();
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
      for(const renderableItem of items){
        const { personGroup, meta: { container, isExiting } } = renderableItem;

        const path = personGroup.contour;
        // const path = simplify(personGroup.contour, 0.01);

        const g = new PIXI.Graphics();
        // g.closePath();

        app.stage.removeChild(container);
        container.removeChildren();

        if(isExiting){
          continue;
        }

        // set a fill and line style
        g.beginFill(0xFF3300);
        g.lineStyle(2, 0xffd900, 1);

        let i = 0;
        for(const [x,y] of path){
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