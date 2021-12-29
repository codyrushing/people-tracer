import ws from 'websocket';
import * as PIXI from 'pixi.js';

const WEBSOCKET_HOST = 'ws://localhost:8080';
const client = new ws.w3cwebsocket(WEBSOCKET_HOST);

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  view: document.querySelector('canvas#canvas')
});

app;

client.onerror = function(err) {
  console.log('Connection Error');
  console.error(err);
};

client.onopen = function() {
  console.log('WebSocket Client Connected');
};

client.onclose = function() {
  console.log('Client Closed');
};

client.onmessage = ({data}) => {
  // console.log(event);
  if(typeof data === 'string'){
    // console.log(JSON.parse(data));
  }
};