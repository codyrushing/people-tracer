import eventEmitter from '../lib/event-emitter';
import debugStageProgram from './debug';

export const allStagePrograms = [debugStageProgram];

export interface ProgramStage {
  name: string;
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  run: () => Promise<void>;
}

export const CURRENT_STAGE_PROGRAM_NAME_KEY = 'current_stage_program';
let currentStage;  
async function startProgramStage(name) : Promise<ProgramStage> {
  if(!name){
    return currentStage;
  }
  const newStage = allStagePrograms.find(program => program.name === name);
  if(newStage){
    if(currentStage){
      await currentStage.destroy();
    }
    currentStage = newStage;
    window.sessionStorage.setItem(CURRENT_STAGE_PROGRAM_NAME_KEY, name);
    await currentStage.init();
  }
  return currentStage;
}
export async function initProgramStageManager() : Promise<ProgramStage> {
  eventEmitter.on('startProgramStage', startProgramStage);
  currentStage = startProgramStage(window.sessionStorage.getItem(CURRENT_STAGE_PROGRAM_NAME_KEY) || 'debug') ;
  return currentStage;
}
