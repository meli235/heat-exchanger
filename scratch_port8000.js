const net = require('net');

const client = new net.Socket();

client.connect(8000, '192.168.101.39', () => {
  console.log('Connected to Port 8000!');
  
  // Hikvision SADP / NetSDK handshake or ISAPI over port 8000
  const isapiOver8000 = 'PUT /ISAPI/PTZCtrl/channels/1/continuous HTTP/1.1\r\nHost: 192.168.101.39:8000\r\nAuthorization: Basic YWRtaW46TWVsY2hhbjUu\r\nContent-Type: application/xml\r\nContent-Length: 104\r\n\r\n<?xml version="1.0" encoding="UTF-8"?><PTZData><pan>60</pan><tilt>0</tilt><zoom>0</zoom></PTZData>';
  
  client.write(isapiOver8000);
});

client.on('data', (data) => {
  console.log('Received raw from 8000:', data.toString('utf8'));
  console.log('Hex:', data.toString('hex'));
});

client.on('error', (err) => {
  console.error('Socket error:', err.message);
});

setTimeout(() => client.destroy(), 3000);
