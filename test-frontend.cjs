const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Frontend Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Frontend accessible:', data.length > 0);
    console.log('Content length:', data.length);
  });
});

req.on('error', (e) => {
  console.error(`Frontend Error: ${e.message}`);
});

req.setTimeout(5000, () => {
  console.error('Frontend request timeout');
});

req.end();