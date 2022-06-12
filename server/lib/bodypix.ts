import 'dotenv/config';
import fs from 'fs/promises';
import { ChildProcess, exec } from 'child_process';
import { 
  getPersonGroups, 
  normalizeContours, 
  normalizePose, 
  Pose, 
  PersonGroup, 
  processIncomingFrame, 
  convertHeatmapToContours,
  Frame
} from '../../util/trace';

const { SAVE_STATIC_FRAMES } = process.env;

// const bodypixCommand = 'python3 bodypix_gl_imx.py --jpeg --model models/bodypix_mobilenet_v1_075_1024_768_16_quant_edgetpu_decoder.tflite --videosrc /dev/video1 --width 1280 --height 720 --mirror';
export const bodypixCommand = 'python3 bodypix_gl_imx.py --jpeg --model models/bodypix_mobilenet_v1_075_768_576_16_quant_edgetpu_decoder.tflite --videosrc /dev/video1 --width 1280 --height 720 --mirror';

export function startRemoteBodypix(bodypixHost='arid-snail') : ChildProcess {
  const bodypixProcess = exec(`ssh mendel@${bodypixHost} 'cd ~/project-bodypix/; ${bodypixCommand}'`);

  bodypixProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  bodypixProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  // listen for when this process exits, and exit bodypix process
  function exitHandler(){
    // whatever happened to get us here - log it
    for(const arg of arguments){
      console.error(arg);
    }
    // kill the bodypix process on the coral board
    exec(`ssh mendel@${bodypixHost} 'pkill -f "bodypix"'`);  
    process.exit();
  };
  process.on('exit', exitHandler);

  //catches ctrl+c event
  process.on('SIGINT', exitHandler);

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler);
  process.on('SIGUSR2', exitHandler);

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler);



  return bodypixProcess;
};

export async function processIncomingMessage(message:string) : Promise<Frame> {

  if(SAVE_STATIC_FRAMES){    
    fs.writeFile(`temp/frames/frame.${Date.now()}.json`, message);
  }

  let {
    heatmap,
    poses
  } : { heatmap: any, poses: Pose[]} = JSON.parse(message);
  const width = heatmap[0].length;
  const height = heatmap.length;

  poses = poses.map(normalizePose);

  const contours = normalizeContours(
    convertHeatmapToContours(heatmap), 
    { width, height }
  );
  
  const personGroups : PersonGroup[] = getPersonGroups(contours, poses);
  return processIncomingFrame({
    t: Date.now(),
    width,
    height,
    personGroups
  });  
}