import { throttle } from 'lodash';
import eventEmitter from '../lib/event-emitter';
import { getContainer } from '../app';

export function getDimensionsFromFrame() : Promise<[number, number]> {
  return new Promise(
    resolve => {
      function onFrame({width, height}){
        eventEmitter.off('frame', onFrame);
        return resolve([width, height]);
      }
      eventEmitter.on('frame', onFrame);
    }
  );
}

// default aspect ratio
export let [frameWidth, frameHeight] = [16, 9];

export function onResizeFn(){
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const container = getContainer();

  const [containerWidth, containerHeight] = windowWidth/windowHeight > frameWidth/frameHeight
    // window is too wide
    ? [
      windowHeight * frameWidth / frameHeight,
      windowHeight
    ]
    // window is too narrow
    : [
      windowWidth,
      windowWidth * frameHeight / frameWidth
    ];

  // resize the container
  container.setAttribute('width', Math.round(containerWidth).toString());
  container.setAttribute('height', Math.round(containerHeight).toString());
}

export const onResize = throttle(
  onResizeFn,
  1000
);

export function initViewportManager(){
  onResizeFn();

  // adjust aspect ratio when a frame comes in
  getDimensionsFromFrame()
    .then(
      ([width, height]) => {
        frameWidth = width;
        frameHeight = height;
        onResizeFn();
      }
    );

  window.addEventListener('resize', onResize);
}