const http = require('http');

function testEditVolunteerNoPasswordChange() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Test Volunteer Updated',
      skill: 'Logistics',
      camp_id: 'camp-3',
      email: 'test@example.com'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers/vol-1792754987790',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Edit Volunteer (No Password Change) ===');
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

function testLoginAfterEdit() {
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
        console.log('\n=== Login After Edit (Same Password) ===');
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

function testEditVolunteerWithPasswordChange() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      name: 'Test Volunteer Updated Again',
      skill: 'Driving',
      camp_id: 'camp-3',
      email: 'test@example.com',
      password: 'newpassword123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers/vol-1792754987790',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Edit Volunteer (With Password Change) ===');
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

function testLoginWithNewPassword() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'newpassword123'
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
        console.log('\n=== Login With New Password ===');
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

function testMeEndpoint(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/auth/volunteer/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== /auth/volunteer/me Test ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  await testEditVolunteerNoPasswordChange();
  await testLoginAfterEdit();
  await testEditVolunteerWithPasswordChange();
  await testLoginWithNewPassword();
  
  // Get token for /me endpoint test
  const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'newpassword123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/volunteer/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const loginResult = await new Promise((resolve) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });
    req.on('error', (e) => { resolve({ error: e.message }); });
    req.write(postData);
    req.end();
  });
  
  if (loginResult.token) {
    await testMeEndpoint(loginResult.token);
  }
  
  console.log('\n=== All tests completed ===');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
});