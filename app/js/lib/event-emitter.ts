import mitt from 'mitt';
import { Frame } from '../../../util/trace';

type Events = {
  frame: Frame,
  startProgramStage: string,
  command: string
}

const emitter = mitt<Events>();

export default emitter;