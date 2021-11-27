import ws from 'websocket';
import * as PIXI from 'pixi.js';

const WEBSOCKET_HOST = 'ws://localhost:8080';
const client = new ws.w3cwebsocket(WEBSOCKET_HOST);

const app = new PIXI.Application();

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
  if(typeof data === 'string'){
    console.log(data);
  }
};

document.body.appendChild(app.view);