import path from 'path';
import fsPromises from 'fs/promises';
import { convertHeatmapToContours } from '../util/trace';

(async function(){
  const tmpDir = path.join(__dirname, '../temp/frames');
  const files = await fsPromises.readdir(tmpDir);
  for(const file of files){
    const fileContents = await fsPromises.readFile(path.join(tmpDir, file));
    const { heatmap } = JSON.parse(fileContents.toString());
    convertHeatmapToContours(heatmap);    
  }
  process.exit();
})();
