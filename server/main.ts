import 'dotenv/config';
import cluster from 'cluster';
import ws from 'ws';
import os = require('os');
import { startRemoteBodypix, processIncomingMessage } from './lib/bodypix';

const { WEBSOCKET_PORT=8080 } = process.env;
const numCPUs = os.cpus().length;

const USE_MULTI_PROCESS = false;
export async function startWebsocketServer(){
  // WORKER
  const wss = new ws.Server({ port: WEBSOCKET_PORT });
  wss.on('error', console.error);
  wss.on('listening', startRemoteBodypix);
  wss.on('connection', function websocketConnection(client) {    
    client.on('message', async function incomingWebsocketMessage(message) {
      try {
        const frame = await processIncomingMessage(message);
        wss.clients.forEach(function each(client) {
          if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({
              type: 'frame',
              payload: frame
            }));
          }
        });
      }
      catch(err){
        console.error(err);
      }
 
    });
  });  
}

if(USE_MULTI_PROCESS && cluster.isPrimary){
  // PRIMARY
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }  
  cluster.on('exit', function(worker, code, signal){
    console.log(`Worker : [ ${worker.process.pid} ][ Status : Exit ][ Signal : ${signal} ][ Code : ${code} ]`);
    cluster.fork();
  });
}
else {
  // worker
  startWebsocketServer()
    .catch(
      err => {
        console.error(err);
        process.exit(1);
      }
    )
}
