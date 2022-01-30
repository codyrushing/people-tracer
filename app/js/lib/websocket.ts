import ws from 'websocket';
import eventEmitter from './event-emitter';

const { WEBSOCKET_HOST } = process.env;

let client;
export function getClient(){
  return client;
}

function createWebsocket(){
  client = new ws.w3cwebsocket(WEBSOCKET_HOST);

  // reinstantiate on error
  client.onerror = function(err) {
    setTimeout(
      createWebsocket,
      1000
    );
    console.error(err);
  };
  
  client.onmessage = ({data}) => {
    if(typeof data === 'string'){
      try {
        const { type, payload } = JSON.parse(data);
        eventEmitter.emit(type, payload);  
      }
      catch(err){
        console.error(err);
      }
    }
  };

  return client;
}

createWebsocket();