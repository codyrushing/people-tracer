import 'dotenv/config';
import path from 'path';
import fsPromises from 'fs/promises';
import ws from 'ws';
import { processIncomingMessage } from './lib/bodypix';

const { WEBSOCKET_PORT=8080 } = process.env;
const wait = (ms=0) => new Promise(
  resolve => setTimeout(resolve, ms)
);

async function startWebsocketServer(){
  // WORKER
  const wss = new ws.Server({ port: WEBSOCKET_PORT });
  wss.on('error', console.error);
  const tmpDir = path.join(__dirname, '../temp/frames');
  const files = await fsPromises.readdir(tmpDir);

  const frameIterator = {
    [Symbol.asyncIterator]() { // (1)
      return {
        loop: true,
        index: 0,
        previousTimestamp: undefined,
        async next(){
          const start = Date.now();
          this.filename = path.join(tmpDir, files[this.index]);
          const timestamp : number = parseInt(path.basename(this.filename, '.json').split('.')[1]);
          const frame = await fsPromises.readFile(this.filename);
          // const frame = JSON.parse(fileContents.toString());
  
          const delay = this.previousTimestamp && timestamp > this.previousTimestamp
            ? timestamp - this.previousTimestamp - (Date.now() - start)
            : 0;

          this.index = (this.loop && this.index >= files.length-1)
            ? 0
            : this.index += 1;
          this.previousTimestamp = timestamp;
  
          await wait(delay);
          return { 
            done: this.index >= files.length,
            value: frame
          };
        }  
      }    
    }
  };

  for await (const frameMessage of frameIterator){
    const frame = await processIncomingMessage(frameMessage.toString());
    wss.clients.forEach(function each(client) {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify({
          type: 'frame',
          payload: frame
        }));
      }
    });    
  }    
}

startWebsocketServer()
  .then(
    () => process.exit()
  )
  .catch(
    (err) => {
      console.error(err);
      process.exit(1);
    }
  )

