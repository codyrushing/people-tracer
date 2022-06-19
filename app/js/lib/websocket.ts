import ws from 'websocket';
import eventEmitter from './event-emitter';

const { APP_WEBSOCKET_HOST } = process.env;

let delayFibonaccis = [0,1];
export function connectToWebsocketChannel(host:string) : WebSocket {
  let client = new ws.w3cwebsocket(host);
  function reconnect(err) {
    if(err){
      console.error(err);
    }
    const delay = delayFibonaccis[0] + delayFibonaccis[1];
    delayFibonaccis.shift();
    delayFibonaccis.push(delay);
    client = connectToWebsocketChannel(host);
    return client;
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

let AppSocketClient;
export function createWebsocketConnection(host=APP_WEBSOCKET_HOST) : WebSocket {
  AppSocketClient = connectToWebsocketChannel(host);
  return AppSocketClient;
}

export function getAppSocketClient() : WebSocket {
  if(AppSocketClient){
    return AppSocketClient;
  }
  return createWebsocketConnection();
}

getAppSocketClient();

eventEmitter.on(
  'reconnect', 
  function onReconnectEvent(){
    const client = getAppSocketClient();
    client.onclose(null);
  }
);