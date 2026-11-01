const http = require('http');

function testPasswordHashNotReturned() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Check Password Hash Not Returned in GET /volunteers ===');
        console.log(`Status: ${res.statusCode}`);
        const volunteers = JSON.parse(data);
        const hasPasswordHash = volunteers.some(v => v.password_hash !== undefined);
        console.log('Password hash present in any volunteer:', hasPasswordHash);
        if (hasPasswordHash) {
          console.log('WARNING: Password hash found in response!');
          volunteers.filter(v => v.password_hash).forEach(v => {
            console.log('  Volunteer with password_hash:', v.id, v.name);
          });
        } else {
          console.log('OK: No password_hash in response');
        }
        resolve({ status: res.statusCode, hasPasswordHash });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.end();
  });
}

function testPasswordHashNotReturnedInGetById() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/volunteers/vol-1792754987790',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== Check Password Hash Not Returned in GET /volunteers/:id ===');
        console.log(`Status: ${res.statusCode}`);
        const volunteer = JSON.parse(data);
        const hasPasswordHash = volunteer.password_hash !== undefined;
        console.log('Password hash present:', hasPasswordHash);
        if (hasPasswordHash) {
          console.log('WARNING: Password hash found in response!');
        } else {
          console.log('OK: No password_hash in response');
        }
        resolve({ status: res.statusCode, hasPasswordHash });
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      resolve({ status: 0, error: e.message });
    });

    req.end();
  });
}

function testVolunteerWithoutCampCannotLogin() {
  return new Promise((resolve) => {
    // Create volunteer without camp
    const postData = JSON.stringify({
      name: 'No Camp Volunteer',
      skill: 'Medical',
      email: 'nocamp@example.com',
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
        console.log('\n=== Create Volunteer Without Camp ===');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        
        if (res.statusCode === 201) {
          const volunteer = JSON.parse(data);
          
          // Try to login
          const loginData = JSON.stringify({
            email: 'nocamp@example.com',
            password: 'password123'
          });
          
          const loginOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/auth/volunteer/login',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(loginData)
            }
          };
          
          const loginReq = http.request(loginOptions, (loginRes) => {
            let loginDataStr = '';
            loginRes.on('data', (chunk) => { loginDataStr += chunk; });
            loginRes.on('end', () => {
              console.log('\n=== Login Volunteer Without Camp ===');
              console.log(`Status: ${loginRes.statusCode}`);
              console.log('Response:', loginDataStr);
              resolve({ status: loginRes.statusCode });
            });
          });
          
          loginReq.on('error', (e) => {
            console.error('Login Request Error:', e.message);
            resolve({ status: 0, error: e.message });
          });
          
          loginReq.write(loginData);
          loginReq.end();
        } else {
          resolve({ status: res.statusCode });
        }
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
  await testPasswordHashNotReturned();
  await testPasswordHashNotReturnedInGetById();
  await testVolunteerWithoutCampCannotLogin();
  console.log('\n=== All security tests completed ===');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
});