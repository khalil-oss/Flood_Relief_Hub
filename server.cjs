const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'public', 'db', 'db.json');

function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Helper to verify volunteer can log in
function validateVolunteerLogin(volunteer, db) {
  if (!volunteer) {
    return { valid: false, error: 'Volunteer not found' };
  }
  if (!volunteer.camp_id) {
    return { valid: false, error: 'Volunteer is not assigned to a camp' };
  }
  const camp = (db.camps || []).find(c => c.id === volunteer.camp_id);
  if (!camp) {
    return { valid: false, error: 'Assigned camp no longer exists' };
  }
  if (camp.status === 'Closed') {
    return { valid: false, error: 'Assigned camp is closed' };
  }
  return { valid: true, camp };
}

// Admin session store (in-memory, server-issued random tokens)
const adminSessions = new Map();

app.post('/auth/admin/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const user = username || email;
  const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@reliefhub.org';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (!user || !password) return res.status(400).json({ error: 'username and password required' });
  if (String(user).toLowerCase() !== String(adminUser).toLowerCase() || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomUUID();
  adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
  res.json({ token, role: 'admin', expires_in: 24 * 60 * 60 });
});

app.post('/admin/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const user = username || email;
  const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@reliefhub.org';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (!user || !password) return res.status(400).json({ error: 'username and password required' });
  if (String(user).toLowerCase() !== String(adminUser).toLowerCase() || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomUUID();
  adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
  res.json({ token, role: 'admin', expires_in: 24 * 60 * 60 });
});

// Volunteer authentication endpoints
app.post('/auth/volunteer/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const db = readDB();
  const volunteer = (db.volunteers || []).find(v => v.email === email.toLowerCase());
  
  if (!volunteer) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  if (!volunteer.password_hash) {
    return res.status(401).json({ error: 'Volunteer account not configured for login. Contact administrator.' });
  }
  
  const validPassword = await bcrypt.compare(password, volunteer.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validation = validateVolunteerLogin(volunteer, db);
  if (!validation.valid) {
    return res.status(403).json({ error: validation.error });
  }
  
  // Return volunteer data (without password hash)
  const { password_hash: _, ...volunteerData } = volunteer;
  res.json({
    volunteer: volunteerData,
    camp: validation.camp,
    token: Buffer.from(JSON.stringify({ volunteerId: volunteer.id, role: 'volunteer', exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64')
  });
});

// Volunteer token verification endpoint
app.get('/auth/volunteer/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    const db = readDB();
    const volunteer = (db.volunteers || []).find(v => v.id === decoded.volunteerId);
    if (!volunteer) {
      return res.status(401).json({ error: 'Volunteer not found' });
    }
    
    const validation = validateVolunteerLogin(volunteer, db);
    if (!validation.valid) {
      return res.status(403).json({ error: validation.error });
    }
    
    const { password_hash: _, ...volunteerData } = volunteer;
    res.json({ volunteer: volunteerData, camp: validation.camp });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Donation-specific validation endpoints
app.post('/donations', (req, res) => {
  const db = readDB();
  const { type, amount_or_quantity, item_id, category, donor } = req.body;
  
  // Validate required fields
  if (!type || amount_or_quantity === undefined || amount_or_quantity === null || !category || !donor) {
    return res.status(400).json({ error: 'type, amount_or_quantity, category, and donor are required' });
  }
  
  const validTypes = ['Cash', 'In-Kind'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Type must be Cash or In-Kind' });
  }
  
  const qty = Number(amount_or_quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Amount/quantity must be a positive integer' });
  }
  
  const validCategories = ['Emergency Relief', 'Medical Supplies', 'Food', 'Water', 'Shelter', 'Hygiene', 'General Relief', 'Other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  let item = null;
  if (type === 'In-Kind') {
    if (!item_id) {
      return res.status(400).json({ error: 'item_id is required for In-Kind donations' });
    }
    item = (db.inventory || []).find(i => i.id === item_id);
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
  } else if (item_id) {
    return res.status(400).json({ error: 'Cash donations should not have an item_id' });
  }
  
  // Create donation
  const newDonation = {
    ...req.body,
    id: `donation-${Date.now()}`,
    amount_or_quantity: qty,
    item_id: type === 'In-Kind' ? item_id : null,
    category: category.trim(),
    donor: donor.trim(),
    created_at: new Date().toISOString(),
  };
  
  db.donations.push(newDonation);
  
  // Update inventory stock for In-Kind donations
  if (type === 'In-Kind' && item) {
    const itemIndex = db.inventory.findIndex(i => i.id === item.id);
    if (itemIndex !== -1) {
      db.inventory[itemIndex].stock = (Number(db.inventory[itemIndex].stock) || 0) + qty;
    }
  }
  
  writeDB(db);
  res.status(201).json(newDonation);
});

// Volunteer-specific validation endpoints
app.post('/volunteers', async (req, res) => {
  const db = readDB();
  const { name, skill, camp_id, email, password } = req.body;
  
  // Validate required fields
  if (!name || !skill) {
    return res.status(400).json({ error: 'name and skill are required' });
  }
  
  const validSkills = ['Medical', 'Logistics', 'Cooking', 'Driving', 'Counselling'];
  if (!validSkills.includes(skill)) {
    return res.status(400).json({ error: 'Invalid skill' });
  }
  
  // Check for duplicate name in same camp
  if (camp_id) {
    const existingVolunteer = (db.volunteers || []).find(v => 
      v.camp_id === camp_id && v.name.toLowerCase() === name.toLowerCase()
    );
    if (existingVolunteer) {
      return res.status(400).json({ error: 'A volunteer with this name is already assigned to this camp' });
    }
    
    // Validate camp exists and is not closed
    const camp = (db.camps || []).find(c => c.id === camp_id);
    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }
    if (camp.status === 'Closed') {
      return res.status(400).json({ error: 'Cannot assign volunteer to a closed camp' });
    }
  }
  
  // Validate email if provided (for login capability)
  if (email) {
    const emailLower = email.toLowerCase();
    const existingEmail = (db.volunteers || []).find(v => v.email === emailLower);
    if (existingEmail) {
      return res.status(400).json({ error: 'A volunteer with this email already exists' });
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }
  
  // Hash password if provided
  let password_hash = null;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    password_hash = await bcrypt.hash(password, 10);
  }
  
  const newVolunteer = {
    name: name.trim(),
    skill,
    camp_id: camp_id || null,
    email: email ? email.toLowerCase() : null,
    password_hash,
    id: `vol-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  
  db.volunteers.push(newVolunteer);
  writeDB(db);
  
  // Return without password hash
  const { password_hash: _, ...volunteerData } = newVolunteer;
  res.status(201).json(volunteerData);
});

// PATCH volunteer - validate camp assignment changes
app.patch('/volunteers/:id', async (req, res) => {
  const db = readDB();
  const { camp_id, name, skill, email, password } = req.body;
  const volunteerId = req.params.id;
  
  const volunteerIndex = db.volunteers.findIndex(v => v.id === volunteerId);
  if (volunteerIndex === -1) {
    return res.status(404).json({ error: 'Volunteer not found' });
  }
  
  const volunteer = db.volunteers[volunteerIndex];
  
  // If skill is being changed, validate it
  if (skill) {
    const validSkills = ['Medical', 'Logistics', 'Cooking', 'Driving', 'Counselling'];
    if (!validSkills.includes(skill)) {
      return res.status(400).json({ error: 'Invalid skill' });
    }
  }
  
  // If email is being changed
  if (email !== undefined) {
    if (email) {
      const emailLower = email.toLowerCase();
      const existingEmail = db.volunteers.find(v => 
        v.id !== volunteerId && v.email === emailLower
      );
      if (existingEmail) {
        return res.status(400).json({ error: 'A volunteer with this email already exists' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      volunteer.email = emailLower;
    } else {
      volunteer.email = null;
    }
  }
  
  // If password is being changed
  if (password !== undefined) {
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      volunteer.password_hash = await bcrypt.hash(password, 10);
    } else {
      volunteer.password_hash = null;
    }
  }
  
  // If camp_id is being changed
  if (camp_id !== undefined) {
    const newCampId = camp_id || null;
    
    // If assigning to a camp, validate
    if (newCampId) {
      const existingVolunteer = db.volunteers.find(v => 
        v.id !== volunteerId && v.camp_id === newCampId && v.name.toLowerCase() === (name || volunteer.name).toLowerCase()
      );
      if (existingVolunteer) {
        return res.status(400).json({ error: 'A volunteer with this name is already assigned to this camp' });
      }
      
      const camp = (db.camps || []).find(c => c.id === newCampId);
      if (!camp) {
        return res.status(404).json({ error: 'Camp not found' });
      }
      if (camp.status === 'Closed') {
        return res.status(400).json({ error: 'Cannot assign volunteer to a closed camp' });
      }
    }
    
    volunteer.camp_id = newCampId;
  }
  
  if (name) volunteer.name = name.trim();
  if (skill) volunteer.skill = skill;
  
  db.volunteers[volunteerIndex] = volunteer;
  writeDB(db);
  
  // Return without password hash
  const { password_hash: _, ...volunteerData } = volunteer;
  res.json(volunteerData);
});

// Dispatch-specific validation endpoints
app.post('/dispatches', (req, res) => {
  const db = readDB();
  const { camp_id, need_id, quantity, status } = req.body;
  
  // Validate required fields
  if (!camp_id || !need_id || quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'camp_id, need_id, and quantity are required' });
  }
  
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }
  
  const validStatuses = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
  const dispatchStatus = status || 'Pending';
  if (!validStatuses.includes(dispatchStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Validate camp exists and is not closed
  const camp = (db.camps || []).find(c => c.id === camp_id);
  if (!camp) {
    return res.status(404).json({ error: 'Camp not found' });
  }
  if (camp.status === 'Closed') {
    return res.status(400).json({ error: 'Cannot create dispatch for a closed camp' });
  }
  
  // Validate need exists and belongs to camp
  const need = (db.needs || []).find(n => n.id === need_id);
  if (!need) {
    return res.status(404).json({ error: 'Need not found' });
  }
  if (need.camp_id !== camp_id) {
    return res.status(400).json({ error: 'Need does not belong to the selected camp' });
  }
  
  // Get inventory item for the need
  const item = (db.inventory || []).find(i => i.id === need.inventory_item_id);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found for this need' });
  }
  
  // Calculate remaining demand
  const required = Number(need.required_quantity) || 0;
  const fulfilled = Number(need.fulfilled_quantity) || 0;
  const existingDispatches = (db.dispatches || []).filter(d => d.need_id === need_id);
  const activeDispatchQty = existingDispatches
    .filter(d => ['Pending', 'In Transit'].includes(d.status))
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const remainingDemand = Math.max(required - fulfilled - activeDispatchQty, 0);
  
  if (qty > remainingDemand) {
    return res.status(400).json({ 
      error: `Dispatch quantity (${qty}) exceeds remaining unmet demand (${remainingDemand})` 
    });
  }
  
  // Calculate available stock (stock already deducted for existing pending/in-transit)
  const availableStock = Math.max(Number(item.stock) || 0, 0);
  if (qty > availableStock) {
    return res.status(400).json({ 
      error: `Dispatch quantity (${qty}) exceeds available stock (${availableStock})` 
    });
  }
  
  // Create dispatch
  const newDispatch = {
    ...req.body,
    id: `dispatch-${Date.now()}`,
    status: dispatchStatus,
    quantity: qty,
    created_at: new Date().toISOString(),
  };
  
  db.dispatches.push(newDispatch);
  
  // Deduct stock for new dispatch
  if (item) {
    const newStock = Math.max((Number(item.stock) || 0) - qty, 0);
    const itemIndex = db.inventory.findIndex(i => i.id === item.id);
    if (itemIndex !== -1) {
      db.inventory[itemIndex].stock = newStock;
    }
  }
  
  writeDB(db);
  res.status(201).json(newDispatch);
});

app.patch('/dispatches/:id/status', (req, res) => {
  const db = readDB();
  const { status } = req.body;
  const dispatchId = req.params.id;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  const validStatuses = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const dispatchIndex = db.dispatches.findIndex(d => d.id === dispatchId);
  if (dispatchIndex === -1) {
    return res.status(404).json({ error: 'Dispatch not found' });
  }
  
  const dispatch = db.dispatches[dispatchIndex];
  const oldStatus = dispatch.status;
  
  if (oldStatus === status) {
    return res.json(dispatch);
  }
  
  // Validate transitions
  if (oldStatus === 'Delivered' && status !== 'Delivered') {
    return res.status(400).json({ error: 'Cannot change status of a delivered dispatch' });
  }
  if (oldStatus === 'Cancelled' && status !== 'Cancelled') {
    return res.status(400).json({ error: 'Cannot change status of a cancelled dispatch' });
  }
  
  const need = (db.needs || []).find(n => n.id === dispatch.need_id);
  if (!need) {
    return res.status(404).json({ error: 'Associated need not found' });
  }
  
  const item = need.inventory_item_id ? (db.inventory || []).find(i => i.id === need.inventory_item_id) : null;
  const quantity = Number(dispatch.quantity) || 0;
  
  // Handle status transitions
  if (oldStatus === 'Pending' || oldStatus === 'In Transit') {
    if (status === 'Delivered') {
      // Increase fulfilled quantity
      const newFulfilled = Math.min(
        (Number(need.fulfilled_quantity) || 0) + quantity,
        Number(need.required_quantity) || 0
      );
      const needIndex = db.needs.findIndex(n => n.id === need.id);
      if (needIndex !== -1) {
        db.needs[needIndex].fulfilled_quantity = newFulfilled;
      }
      dispatch.delivered_at = new Date().toISOString();
    } else if (status === 'Cancelled') {
      // Restore stock
      if (item) {
        const itemIndex = db.inventory.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          db.inventory[itemIndex].stock = Math.max((Number(item.stock) || 0) + quantity, 0);
        }
      }
      dispatch.cancelled_at = new Date().toISOString();
    } else if (status === 'In Transit' && oldStatus === 'Pending') {
      // No stock change
    }
  }
  
  dispatch.status = status;
  db.dispatches[dispatchIndex] = dispatch;
  writeDB(db);
  res.json(dispatch);
});

// GET /dispatches - with query param filtering
app.get('/dispatches', (req, res) => {
  const db = readDB();
  let results = db.dispatches || [];
  
  Object.keys(req.query).forEach(key => {
    results = results.filter(item => String(item[key]) === req.query[key]);
  });
  
  res.json(results);
});

// GET /dispatches/:id
app.get('/dispatches/:id', (req, res) => {
  const db = readDB();
  const item = (db.dispatches || []).find(i => i.id === req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'Not found' });
});

// PUT /dispatches/:id (full update)
app.put('/dispatches/:id', (req, res) => {
  const db = readDB();
  const index = (db.dispatches || []).findIndex(i => i.id === req.params.id);
  if (index !== -1) {
    db.dispatches[index] = { ...db.dispatches[index], ...req.body };
    writeDB(db);
    res.json(db.dispatches[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// PATCH /dispatches/:id (partial update) - for non-status updates
app.patch('/dispatches/:id', (req, res) => {
  const db = readDB();
  const index = (db.dispatches || []).findIndex(i => i.id === req.params.id);
  if (index !== -1) {
    // Prevent status change through this endpoint (use /status endpoint)
    const { status: _status, ...updateData } = req.body;
    db.dispatches[index] = { ...db.dispatches[index], ...updateData };
    writeDB(db);
    res.json(db.dispatches[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// DELETE /dispatches/:id
app.delete('/dispatches/:id', (req, res) => {
  const db = readDB();
  db.dispatches = (db.dispatches || []).filter(i => i.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

// GET /donations - with query param filtering
app.get('/donations', (req, res) => {
  const db = readDB();
  let results = db.donations || [];
  
  Object.keys(req.query).forEach(key => {
    results = results.filter(item => String(item[key]) === req.query[key]);
  });
  
  res.json(results);
});

// GET /donations/:id
app.get('/donations/:id', (req, res) => {
  const db = readDB();
  const item = (db.donations || []).find(i => i.id === req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'Not found' });
});

// DELETE /donations/:id - reduce stock for In-Kind donations
app.delete('/donations/:id', (req, res) => {
  const db = readDB();
  const donationIndex = (db.donations || []).findIndex(i => i.id === req.params.id);
  if (donationIndex === -1) {
    return res.status(404).json({ error: 'Donation not found' });
  }
  
  const donation = db.donations[donationIndex];
  
  // If In-Kind, reduce inventory stock
  if (donation.type === 'In-Kind' && donation.item_id) {
    const itemIndex = db.inventory.findIndex(i => i.id === donation.item_id);
    if (itemIndex !== -1) {
      const currentStock = Number(db.inventory[itemIndex].stock) || 0;
      const donatedQty = Number(donation.amount_or_quantity) || 0;
      db.inventory[itemIndex].stock = Math.max(currentStock - donatedQty, 0);
    }
  }
  
  db.donations.splice(donationIndex, 1);
  writeDB(db);
  res.status(204).send();
});

// GET /volunteers - with query param filtering
app.get('/volunteers', (req, res) => {
  const db = readDB();
  let results = (db.volunteers || []).map(v => {
    const { password_hash: _, ...volunteerData } = v;
    return volunteerData;
  });
  
  Object.keys(req.query).forEach(key => {
    results = results.filter(item => String(item[key]) === req.query[key]);
  });
  
  res.json(results);
});

// GET /volunteers/:id
app.get('/volunteers/:id', (req, res) => {
  const db = readDB();
  const item = (db.volunteers || []).find(i => i.id === req.params.id);
  if (item) {
    const { password_hash: _, ...volunteerData } = item;
    res.json(volunteerData);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// DELETE /volunteers/:id
app.delete('/volunteers/:id', (req, res) => {
  const db = readDB();
  db.volunteers = (db.volunteers || []).filter(i => i.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

const collections = ['camps', 'inventory', 'needs'];

collections.forEach(collection => {
  // GET all / GET with query params
  app.get(`/${collection}`, (req, res) => {
    const db = readDB();
    let results = db[collection] || [];
    
    Object.keys(req.query).forEach(key => {
      results = results.filter(item => String(item[key]) === req.query[key]);
    });
    
    res.json(results);
  });

  // GET by ID
  app.get(`/${collection}/:id`, (req, res) => {
    const db = readDB();
    const item = (db[collection] || []).find(i => i.id === req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  });

  // POST create
  app.post(`/${collection}`, (req, res) => {
    const db = readDB();
    const newItem = { ...req.body, id: `${collection}-${Date.now()}` };
    db[collection].push(newItem);
    writeDB(db);
    res.status(201).json(newItem);
  });

  // PUT update (full)
  app.put(`/${collection}/:id`, (req, res) => {
    const db = readDB();
    const index = db[collection].findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      db[collection][index] = { ...db[collection][index], ...req.body };
      writeDB(db);
      res.json(db[collection][index]);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // PATCH update (partial)
  app.patch(`/${collection}/:id`, (req, res) => {
    const db = readDB();
    const index = db[collection].findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      db[collection][index] = { ...db[collection][index], ...req.body };
      writeDB(db);
      res.json(db[collection][index]);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // DELETE
  app.delete(`/${collection}/:id`, (req, res) => {
    const db = readDB();
    db[collection] = db[collection].filter(i => i.id !== req.params.id);
    writeDB(db);
    res.status(204).send();
  });
});

// --- AI Camp Risk Assessment ---
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';

function buildCampPayload(db, camp) {
  const needs = (db.needs || []).filter(n => n.camp_id === camp.id);
  const inventory = {};
  for (const item of db.inventory || []) {
    inventory[item.id] = { stock: item.stock, reorder_level: item.reorder_level };
  }
  const dispatches = (db.dispatches || []).filter(d => {
    if (d.camp_id !== camp.id) return false;
    const need = (db.needs || []).find(n => n.id === d.need_id);
    // exclude dispatches whose need does not belong to this camp
    return !need || need.camp_id === camp.id;
  });
  return { camp, needs, inventory, dispatches };
}

function requireAdminRisk(req, res) {
  // Legacy shared key (server-side only)
  const key = process.env.ADMIN_RISK_KEY;
  if (key && req.headers['x-admin-key'] === key) return true;
  // Server-issued admin token
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    const exp = adminSessions.get(token);
    if (exp && exp > Date.now()) return true;
    if (exp) adminSessions.delete(token);
  }
  if (!key && adminSessions.size === 0) {
    res.status(503).json({ error: 'Admin risk auth not configured' });
    return false;
  }
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

app.get('/risk/assess', async (req, res) => {
  if (!requireAdminRisk(req, res)) return;
  try {
    const db = readDB();
    const camps = (db.camps || []).filter(c => c.status !== 'Closed');
    const results = [];
    for (const camp of camps) {
      const payload = buildCampPayload(db, camp);
      try {
        const r = await fetch(`${PYTHON_SERVICE_URL}/assess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`python ${r.status}`);
        const assessment = await r.json();
        results.push({ camp_id: camp.id, camp_name: camp.name, ...assessment });
      } catch {
        results.push({ camp_id: camp.id, camp_name: camp.name, error: 'Risk service unavailable', score: null, risk_level: 'Unknown' });
      }
    }
    res.json({ results, generated_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/risk/explain', async (req, res) => {
  if (!requireAdminRisk(req, res)) return;
  const { camp_id, assessment } = req.body || {};
  if (!camp_id || !assessment) return res.status(400).json({ error: 'camp_id and assessment required' });
  if (!AI_API_KEY) {
    return res.status(503).json({ error: 'AI API key not configured', explanation: null });
  }
  try {
    // Minimal OpenAI-compatible call
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a relief coordinator assistant. Use only supplied facts. Do not change the score or risk level. Identify uncertainty. Provide practical actions.' },
          { role: 'user', content: JSON.stringify({ camp_id, assessment }) },
        ],
      }),
    });
    if (!r.ok) throw new Error(`ai ${r.status}`);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ explanation: text, score_preserved: assessment.score });
  } catch (e) {
    res.status(502).json({ error: e.message, explanation: null });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  collections.forEach(c => {
    console.log(`  http://localhost:${PORT}/${c}`);
  });
});