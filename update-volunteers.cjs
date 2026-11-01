const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'public', 'db', 'db.json');

async function updateVolunteers() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(data);
  
  // Default password for all existing volunteers
  const defaultPassword = 'volunteer123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  // Update each volunteer with email and password_hash
  db.volunteers = db.volunteers.map((volunteer, index) => {
    // Generate email based on name
    const email = volunteer.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@reliefhub.org';
    
    return {
      ...volunteer,
      email: email,
      password_hash: passwordHash
    };
  });
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Updated volunteers with email and password_hash');
  console.log('Default password for all volunteers:', defaultPassword);
}

updateVolunteers().catch(console.error);