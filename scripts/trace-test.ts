import path from 'path';
import fsPromises from 'fs/promises';
import { 
  convertHeatmapToContours, 
  normalizeContours, 
  normalizePose, 
  PersonGroup,
  getPersonGroups,
  processIncomingFrame
} from '../util/trace';

(async function(){
  try {
    const tmpDir = path.join(__dirname, '../temp/frames');
    const files = await fsPromises.readdir(tmpDir);
    for(const file of files){
      const fileContents = await fsPromises.readFile(path.join(tmpDir, file));
      let { heatmap, poses } = JSON.parse(fileContents.toString());
      const width = heatmap[0].length;
      const height = heatmap.length;
      
      const contours = normalizeContours(
        convertHeatmapToContours(heatmap), 
        { width, height }
      );

      poses = poses.map(normalizePose);              
      
      const personGroups : PersonGroup[] = getPersonGroups(contours, poses);
      const frame = processIncomingFrame({
        t: Date.now(),
        width,
        height,
        personGroups
      });

      if(frame.personGroups && frame.personGroups.length && frame.personGroups[0].contour.length > 6){
        console.log(frame);
      }
    }
    process.exit();  
  }
  catch(err){
    console.error(err);
  }
})();
