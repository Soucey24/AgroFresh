import { supabase } from '../app.js';

// Note: Tables should be created in Supabase SQL Editor using postgres-schema.sql
// This file shows how to query using Supabase

// Create user
export async function createUser(name, email, passwordHash, role, location = null) {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name,
        email,
        password_hash: passwordHash,
        role,
        location,
        status: 'Active'
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Get user by email and role
export async function getUserByEmailAndRole(email, role) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('role', role)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

// Get user by ID
export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Update user
export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Update last login
export async function updateLastLogin(userId) {
  const { error } = await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

// Get all users with a specific role
export async function getUsersByRole(role) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role);

  if (error) throw error;
  return data;
}

// Check if user exists
export async function userExists(email, role) {
  const user = await getUserByEmailAndRole(email, role);
  return !!user;
}

// Delete user
export async function deleteUser(id) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Legacy function for table creation - not needed with Supabase
// Tables are created via SQL Editor
export async function createUsersTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}
