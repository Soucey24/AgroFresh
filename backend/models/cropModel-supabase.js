import { supabase } from '../app.js';

// Create crop listing
export async function createCrop(name, description, price, quantity, unit, farmerId, image, expiryDate = null) {
  const { data, error } = await supabase
    .from('crops')
    .insert([
      {
        name,
        description,
        price,
        quantity,
        unit: unit || 'kg',
        farmer_id: farmerId,
        image,
        expiry_date: expiryDate,
        available: true
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Get crop by ID
export async function getCropById(id) {
  const { data, error } = await supabase
    .from('crops')
    .select('*, users!farmer_id(id, name, email, location)')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get all available crops
export async function getAvailableCrops(limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from('crops')
    .select('*, users!farmer_id(id, name, email, location)')
    .eq('available', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get crops by farmer ID
export async function getCropsByFarmerId(farmerId, limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Update crop
export async function updateCrop(cropId, updates) {
  const { data, error } = await supabase
    .from('crops')
    .update(updates)
    .eq('id', cropId)
    .select();

  if (error) throw error;
  return data[0];
}

// Update crop quantity and availability
export async function updateCropQuantity(cropId, quantity) {
  const { data, error } = await supabase
    .from('crops')
    .update({
      quantity,
      available: quantity > 0 ? true : false
    })
    .eq('id', cropId)
    .select();

  if (error) throw error;
  return data[0];
}

// Delete crop
export async function deleteCrop(cropId) {
  const { error } = await supabase
    .from('crops')
    .delete()
    .eq('id', cropId);

  if (error) throw error;
}

// Search crops by name/description
export async function searchCrops(query, limit = 100) {
  const { data, error } = await supabase
    .from('crops')
    .select('*, users!farmer_id(id, name, email, location)')
    .ilike('name', `%${query}%`)
    .eq('available', true)
    .limit(limit);

  if (error) throw error;
  return data;
}

// Legacy function - not needed with Supabase
export async function createCropsTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}
