import cluster from 'cluster';
import ws from 'ws';
import { imagedataToTracedata /*, imagedataToSVG*/ } from 'imagetracerjs';
import os = require('os');
const numCPUs = os.cpus().length;
import { TraceData, normalizeTraceData, Pose } from './util/trace';

if(cluster.isMaster){
  // MASTER
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', function(worker, code, signal){
    console.log(`Worker : [ ${worker.process.pid} ][ Status : Exit ][ Signal : ${signal} ][ Code : ${code} ]`);
    cluster.fork();
  })
}
else {
  // WORKER
  const wss = new ws.Server({ port: 8080 });
  wss.on('listening', () => console.log('listening'));
  wss.on('connection', function connection(client) {
    client.on('message', function incoming(message) {
      const now = Date.now();
      const {
        heatmap: bitmap,
        poses
      } : { heatmap: any, poses: Pose[]} = JSON.parse(message);

      poses;

      const width = bitmap[0].length;
      const height = bitmap.length;
      // flatten bitmap into single array of floats 0...255
      const pixels = bitmap.reduce(
        (acc, v) => {
          acc = acc.concat(v);
          return acc;
        },
        []
      );
      
      const data = new Uint8ClampedArray(pixels.length * 4);
      for(let i=0; i<pixels.length; i++){
        // set each pixel to black with variable 
        let start = i * 4;
        data[start] = 0;
        data[start+1] = 0;
        data[start+2] = 0;
        data[start+3] = pixels[i] * 255;
        /* alternative strategy - threshold 0 - 255
        data[start+3] = pixels[i]
          ? 255
          : 0;
        */
      }

      /*
      const svg = imagedataToSVG(
        {
          data,
          width,
          height
        }
      );
  
      console.log(svg.toString());
      */

      const traceData : TraceData = imagedataToTracedata({
        data,
        width,
        height
      });

      normalizeTraceData(traceData);

      console.log(traceData.layers.length);

      for(let layer of traceData.layers){
        console.log('begin layer');
        console.log(layer);
        // for(let path of layer){
        //   console.log('boundingbox');
        //   console.log(path.boundingbox);
        //   console.log('segments');
        //   console.log(path.segments);
        // }
      }

      console.log('ms elapsed', Date.now() - now);
    });
  });  
  // worker
}
