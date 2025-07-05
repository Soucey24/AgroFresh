import { db } from '../app.js';

export const listCrops = async (req, res) => {
  try {
    // Quick fix: delete crops older than 7 days
    await db.query("DELETE FROM crops WHERE created_at < NOW() - INTERVAL 7 DAY");
    let crops;
    if (req.session.user && req.session.user.role === 'farmer') {
      [crops] = await db.query(`
        SELECT c.*, u.name as farmer_name, u.location as farmer_location 
        FROM crops c 
        JOIN users u ON c.farmer_id = u.id 
        WHERE c.farmer_id = ?
      `, [req.session.user.id]);
    } else {
      [crops] = await db.query(`
        SELECT c.*, u.name as farmer_name, u.location as farmer_location 
        FROM crops c 
        JOIN users u ON c.farmer_id = u.id
      `);
    }
    
    // Transform the data to match frontend expectations
    const transformedCrops = crops.map(crop => ({
      id: crop.id,
      name: crop.name,
      description: crop.description,
      price: parseFloat(crop.price),
      quantity: crop.quantity,
      unit: 'kg', // Default unit
      expiryDate: crop.expiry_date,
      farmer: crop.farmer_name,
      location: crop.farmer_location,
      harvestDate: crop.created_at,
      image: crop.image
    }));
    
    res.json(transformedCrops);
  } catch (err) {
    console.error('List crops error:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

export const createCrop = async (req, res) => {
  console.log('--- CREATE CROP ATTEMPT ---');
  console.log('REQ.BODY:', req.body);
  console.log('REQ.FILE:', req.file);
  console.log('REQ.SESSION:', req.session);
  console.log('REQ.SESSION.USER:', req.session.user);
  const { name, description, price, quantity, expiry_date } = req.body;
  const farmer_id = req.session.user?.id;
  let image = null;
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
  } else if (req.body.image) {
    image = req.body.image;
  }
  if (!name || !price || !quantity || !farmer_id) {
    console.log('Missing required fields:', { name, price, quantity, farmer_id });
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    console.log('Inserting crop with:', { name, description, price, quantity, expiry_date, farmer_id, image });
    const [result] = await db.query(
      'INSERT INTO crops (name, description, price, quantity, expiry_date, farmer_id, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, quantity, expiry_date, farmer_id, image]
    );
    console.log('Crop inserted with ID:', result.insertId);
    
    // Get the created crop with farmer information
    const [crops] = await db.query(`
      SELECT c.*, u.name as farmer_name, u.location as farmer_location 
      FROM crops c 
      JOIN users u ON c.farmer_id = u.id 
      WHERE c.id = ?
    `, [result.insertId]);
    
    const crop = crops[0];
    const transformedCrop = {
      id: crop.id,
      name: crop.name,
      description: crop.description,
      price: parseFloat(crop.price),
      quantity: crop.quantity,
      unit: 'kg', // Default unit
      expiryDate: crop.expiry_date,
      farmer: crop.farmer_name,
      location: crop.farmer_location,
      harvestDate: crop.created_at,
      image: crop.image
    };
    
    res.status(201).json(transformedCrop);
  } catch (err) {
    console.error('CREATE CROP ERROR:', err);
    res.status(500).json({ error: 'Failed to create crop', details: err.message });
  }
};

export const getCrop = async (req, res) => {
  try {
    const [crops] = await db.query(`
      SELECT c.*, u.name as farmer_name, u.location as farmer_location 
      FROM crops c 
      JOIN users u ON c.farmer_id = u.id 
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (crops.length === 0) return res.status(404).json({ error: 'Crop not found' });
    
    const crop = crops[0];
    const transformedCrop = {
      id: crop.id,
      name: crop.name,
      description: crop.description,
      price: parseFloat(crop.price),
      quantity: crop.quantity,
      unit: 'kg', // Default unit
      expiryDate: crop.expiry_date,
      farmer: crop.farmer_name,
      location: crop.farmer_location,
      harvestDate: crop.created_at,
      image: crop.image
    };
    
    res.json(transformedCrop);
  } catch (err) {
    console.error('Get crop error:', err);
    res.status(500).json({ error: 'Failed to fetch crop' });
  }
};

export const updateCrop = async (req, res) => {
  const { name, description, price, quantity, expiry_date, image } = req.body;
  const farmer_id = req.session.user?.id;
  try {
    // Only allow farmer to update their own crop
    const [crops] = await db.query('SELECT * FROM crops WHERE id = ?', [req.params.id]);
    if (crops.length === 0) return res.status(404).json({ error: 'Crop not found' });
    if (crops[0].farmer_id !== farmer_id) return res.status(403).json({ error: 'Forbidden' });
    await db.query(
      'UPDATE crops SET name=?, description=?, price=?, quantity=?, expiry_date=?, image=? WHERE id=?',
      [name, description, price, quantity, expiry_date, image, req.params.id]
    );
    res.json({ message: 'Crop updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update crop' });
  }
};

export const deleteCrop = async (req, res) => {
  const farmer_id = req.session.user?.id;
  try {
    // Only allow farmer to delete their own crop
    const [crops] = await db.query('SELECT * FROM crops WHERE id = ?', [req.params.id]);
    if (crops.length === 0) return res.status(404).json({ error: 'Crop not found' });
    if (crops[0].farmer_id !== farmer_id) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM crops WHERE id = ?', [req.params.id]);
    res.json({ message: 'Crop deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete crop' });
  }
}; 