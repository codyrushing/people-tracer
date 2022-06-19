import 'dotenv/config';
import cluster from 'cluster';
import os = require('os');
import { startRemoteBodypix, processIncomingMessage } from './lib/bodypix';
import { startFramesChannel, startAppChannel, broadcastToAllListeners } from './lib/websocket';

const numCPUs = os.cpus().length;

/*
// there are two different websocket servers (channels)
1. One for the Coral boards publish raw frames
2. One for the 
*/

const USE_MULTI_PROCESS = false;
export async function startWebsocketServers(){
  // WORKER
  const framesChannel = startFramesChannel();
  const appChannel = startAppChannel();

  framesChannel.on('error', console.error);
  framesChannel.on('listening', startRemoteBodypix);
  framesChannel.on('connection', function framesWebsocketConnection(client){    
    client.on('message', async function incomingFramesWebsocketMessage(message){
      try {
        // process the frame
        const frame = await processIncomingMessage(message.toString());
        // publish processed frame to all listening clients in the app channel
        broadcastToAllListeners(appChannel, JSON.stringify({
          type: 'frame',
          payload: frame
        }))
      }
      catch(err){
        console.error(err);
      }
    });
  });

  appChannel.on('connection', function appWebsocketConnection(client){
    client.on('message', function incomingAppWebsocketMessage(message){
      // rebroadcast message to all listening sockets in the app channel
      broadcastToAllListeners(appChannel, message.toString())
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
  startWebsocketServers()
    .catch(
      err => {
        console.error(err);
        process.exit(1);
      }
    )
}
