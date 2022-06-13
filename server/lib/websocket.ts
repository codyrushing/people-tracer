import 'dotenv/config';
import ws from 'ws';

const { APP_WEBSOCKET_PORT=7070 } = process.env;

export function startChannel(port:number) : ws.Server {
  const appChannel = new ws.Server({ port });
  return appChannel;
}

export function startAppChannel() : ws.Server {
  return startChannel(Number(APP_WEBSOCKET_PORT))  
}

export function broadcastToAllListeners(channel:ws.Server, message:string){
  channel.clients.forEach(function each(client) {
    if (client.readyState === ws.OPEN) {
      client.send(message);
    }
  });
}