import ws from 'websocket';
import eventEmitter from './event-emitter';

const { APP_WEBSOCKET_HOST } = process.env;

export function connectToWebsocketChannel(host:string) : WebSocket {
  const client = new ws.w3cwebsocket(host);
  function reconnect(err) {
    setTimeout(
      () => connectToWebsocketChannel(host),
      1000
    );
    console.error(err);
  };

  client.onclose = reconnect;
  client.onerror = reconnect;
  
  client.onmessage = function onMessage({data}){
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

export const CommandsClient = connectToWebsocketChannel(APP_WEBSOCKET_HOST);