import cluster from 'cluster';
import ws from 'ws';
import { exec } from 'child_process';
import os = require('os');
const numCPUs = os.cpus().length;
import { getPersonGroups, normalizeContours, normalizePose, Pose, PersonGroup, frames } from './util/trace';
import ndArrayPack from 'ndarray-pack';
import contour2d from 'contour-2d';

// const bodypixCommand = 'python3 bodypix_gl_imx.py --jpeg --model models/bodypix_mobilenet_v1_075_1024_768_16_quant_edgetpu_decoder.tflite --videosrc /dev/video1 --width 1280 --height 720 --mirror';
const bodypixCommand = 'python3 bodypix_gl_imx.py --jpeg --model models/bodypix_mobilenet_v1_075_768_576_16_quant_edgetpu_decoder.tflite --videosrc /dev/video1 --width 1280 --height 720 --mirror';
function exitHandler() {
  // whatever happened to get us here - log it
  for(const arg of arguments){
    console.error(arg);
  }
  // kill the bodypix process on the coral board
  exec(`ssh mendel@arid-snail 'pkill -f "bodypix"'`);  
  process.exit();
}

process.on('exit', exitHandler);

//catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

//catches uncaught exceptions
process.on('uncaughtException', exitHandler);

const USE_MULTI_PROCESS = false;

export function startWebsocketServer(){
  // WORKER
  const wss = new ws.Server({ port: 8080 });

  wss.on('error', err => {
    console.error(err);
  })
  wss.on('listening', () => {
    const bodypixProcess = exec(`ssh mendel@arid-snail 'cd ~/project-bodypix/; ${bodypixCommand}'`);

    bodypixProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    bodypixProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

  });
  wss.on('connection', function connection(client) {    
    client.on('message', function incoming(message) {
      try {
        const now = Date.now();
        now;
        let {
          heatmap: bitmap,
          poses
        } : { heatmap: any, poses: Pose[]} = JSON.parse(message);
        const width = bitmap[0].length;
        const height = bitmap.length;
        
        poses = poses.map(normalizePose);
                
        const contours = normalizeContours(contour2d(ndArrayPack(
          bitmap.map(
            r => r.map(
              p => p >= 1 ? 1 : 0
            )
          )
        )), { width, height });
        
        const personGroups : PersonGroup[] = getPersonGroups(contours, poses);

        frames.unshift({
          t: new Date(),
          personGroups
        });

        wss.clients.forEach(function each(client) {
          if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(personGroups));
          }
        });
  
        // const traceData : TraceData = imagedataToTracedata({
        //   data,
        //   width,
        //   height
        // });
  
        // normalizeTraceData(traceData);
  
        // console.log('ms elapsed', Date.now() - now);   
      }
      catch(err){
        console.error(err);
      }
 
    });
  });  
}

if(USE_MULTI_PROCESS && cluster.isMaster){
  // MASTER
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }  
  cluster.on('exit', function(worker, code, signal){
    console.log(`Worker : [ ${worker.process.pid} ][ Status : Exit ][ Signal : ${signal} ][ Code : ${code} ]`);
    cluster.fork();
  });
  
  // setup node process
}
else {
  // worker
  startWebsocketServer();
}
