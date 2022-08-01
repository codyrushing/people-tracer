import eventEmitter from './event-emitter';

export const BROADCAST_CHANNEL_NAME = 'comms';

export interface CommandMessage {
  type: 'command',
  payload: any
}

export const broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

broadcastChannel.onmessage = function onReceiveBroadcastChannelMessage({source, data}){
  if(data?.type === 'command'){
    eventEmitter.emit('command', data.payload);
  }
}