const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'public', 'db', 'db.json');

function fixVolunteer3() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(data);
  
  // Fix vol-3 (Mohammed Hassan) - camp-1 doesn't exist, assign to puAwg1xpmJs (hyderabad - Active)
  db.volunteers = db.volunteers.map((volunteer) => {
    if (volunteer.id === 'vol-3') {
      return {
        ...volunteer,
        camp_id: 'puAwg1xpmJs' // hyderabad - Active
      };
    }
    return volunteer;
  });
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Fixed vol-3 camp_id to puAwg1xpmJs (hyderabad - Active)');
}

fixVolunteer3().catch(console.error);