const http = require('http');

const postData = JSON.stringify({
  email: 'dr.ahmed.khan@reliefhub.org',
  password: 'volunteer123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/auth/volunteer/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();