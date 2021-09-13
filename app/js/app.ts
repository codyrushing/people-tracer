import ws from 'websocket';

const WEBSOCKET_HOST = 'ws://localhost:8080';
const client = new ws.w3cwebsocket(WEBSOCKET_HOST);

const canvasContainer = document.getElementById('canvas');
const domParser = new DOMParser()

client.onerror = function(err) {
  console.log('Connection Error');
  console.error(err);
};

client.onopen = function() {
  console.log('WebSocket Client Connected');
};

client.onclose = function() {
  console.log('Client Closed');
};

let hasDrawnSVG = false;
client.onmessage = ({data}) => {
  if(typeof data === 'string'){
    // const svg = canvasContainer.querySelector('svg');
    const doc = domParser.parseFromString(data, 'text/html');
    const svg = doc.querySelector('svg');
    // svg.outerHTML = data;
    const width = parseInt(svg.getAttribute('width'), 10);
    const height = parseInt(svg.getAttribute('height'), 10);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', canvasContainer.offsetWidth.toString());
    svg.setAttribute('height', (canvasContainer.offsetWidth / width * height).toString());
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(svg);
    hasDrawnSVG = true;
  }
};