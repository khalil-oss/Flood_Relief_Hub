const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'public', 'db', 'db.json');

async function fixVolunteers() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(data);
  
  // Default password for all existing volunteers
  const defaultPassword = 'volunteer123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  // Map of volunteer names to correct camp IDs
  const campMap = {
    'Dr. Ahmed Khan': 'camp-3', // Larkana Riverside Camp (Active)
    'Sarah Ali': 'camp-2', // Sukkur Main Camp (Full)
    'Mohammed Hassan': 'camp-1', // camp-1 doesn't exist, let's check...
    'Fatima Sheikh': 'camp-3', // Larkana Riverside Camp
    'Usman Tariq': 'camp-2', // Sukkur Main Camp
    'Ayesha Malik': 'camp-5', // Shikarpur Emergency Camp
    'Bilal Ahmed': 'camp-6', // Jacobabad Central Camp
    'Zainab Raza': 'camp-7', // Ghotki Relief Camp
    'Kamran Shah': 'camp-8', // Naushahro Feroze Camp
    'Hira Noor': 'camp-2', // Sukkur Main Camp
    'Danish Qureshi': null, // unassigned
    'Maria Khan': null, // unassigned
    'Omar Farooq': null, // unassigned
    'Sanaullah Memon': 'camp-3', // Larkana Riverside Camp
    'Lubna Soomro': null, // unassigned
  };
  
  // First, let's check what camps exist
  const camps = db.camps || [];
  console.log('Available camps:');
  camps.forEach(c => console.log(`  ${c.id}: ${c.name} (${c.status})`));
  
  // Update each volunteer with email and password_hash
  db.volunteers = db.volunteers.map((volunteer) => {
    const correctCampId = campMap[volunteer.name];
    const email = volunteer.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@reliefhub.org';
    // Fix double dots
    const cleanEmail = email.replace(/\.\.+/g, '.');
    
    return {
      ...volunteer,
      email: cleanEmail,
      password_hash: passwordHash,
      camp_id: correctCampId !== undefined ? correctCampId : volunteer.camp_id
    };
  });
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Fixed volunteers with correct emails, camp_ids, and password_hash');
  console.log('Default password for all volunteers:', defaultPassword);
}

fixVolunteers().catch(console.error);