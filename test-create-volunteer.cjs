const http = require('http');

function testCreateVolunteer() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Test Volunteer',
      skill: 'Medical',
      camp_id: 'camp-3',
      email: 'test@example.com',
      password: 'password123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Create Volunteer Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

function testDuplicateEmail() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Another Volunteer',
      skill: 'Medical',
      camp_id: 'camp-3',
      email: 'test@example.com',
      password: 'password123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Duplicate Email Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

function testInvalidEmail() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Invalid Email Volunteer',
      skill: 'Medical',
      camp_id: 'camp-3',
      email: 'invalid-email',
      password: 'password123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Invalid Email Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

function testShortPassword() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Short Password Volunteer',
      skill: 'Medical',
      camp_id: 'camp-3',
      email: 'short@example.com',
      password: '123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Short Password Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

function testClosedCamp() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Closed Camp Volunteer',
      skill: 'Medical',
      camp_id: 'camp-4',
      email: 'closed@example.com',
      password: 'password123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Closed Camp Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

function testLoginNewVolunteer() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
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
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Login New Volunteer Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  await testCreateVolunteer();
  await testDuplicateEmail();
  await testInvalidEmail();
  await testShortPassword();
  await testClosedCamp();
  await testLoginNewVolunteer();
  console.log('\n=== All tests completed ===');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
});