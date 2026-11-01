const http = require('http');

function testLogin(email, password, description) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email, password });
    
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
        console.log(`\n${description}`);
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error(`\n${description} - Request Error: ${e.message}`);
      resolve({ status: 0, error: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`\n${description} - Request Timeout`);
      resolve({ status: 0, error: 'Timeout' });
    });

    req.setTimeout(5000);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== Volunteer Login Tests ===');
  
  // Test 1: Valid login
  await testLogin('dr.ahmed.khan@reliefhub.org', 'volunteer123', 'Test 1: Valid login (Dr. Ahmed Khan)');
  
  // Test 2: Wrong password
  await testLogin('dr.ahmed.khan@reliefhub.org', 'wrongpassword', 'Test 2: Wrong password');
  
  // Test 3: Non-existent email
  await testLogin('nonexistent@reliefhub.org', 'volunteer123', 'Test 3: Non-existent email');
  
  // Test 4: Unassigned volunteer (Danish Qureshi - vol-11)
  await testLogin('danish.qureshi@reliefhub.org', 'volunteer123', 'Test 4: Unassigned volunteer (Danish Qureshi)');
  
  // Test 5: Valid login - Sarah Ali
  await testLogin('sarah.ali@reliefhub.org', 'volunteer123', 'Test 5: Valid login (Sarah Ali)');
  
  console.log('\n=== All tests completed ===');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
});