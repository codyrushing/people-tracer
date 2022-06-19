import mitt from 'mitt';
import { Frame } from '../../../util/trace';

type Events = {
  frame: Frame;
  startProgramStage: {
    name: string
  };
  reconnect: any;
  command: string;  
}

const emitter = mitt<Events>();

export default emitter;