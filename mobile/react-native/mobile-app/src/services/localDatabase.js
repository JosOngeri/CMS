import * as SQLite from 'expo-sqlite';

const DB_NAME = 'kmaincms_offline.db';
let db = null;

// Initialize database
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create tables for offline storage
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        is_published INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'synced',
        synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT,
        location TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_public INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'synced',
        synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        department_id INTEGER,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'synced',
        synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        transaction_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'synced',
        synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_announcements_sync ON announcements(sync_status);
      CREATE INDEX IF NOT EXISTS idx_events_sync ON events(sync_status);
      CREATE INDEX IF NOT EXISTS idx_members_sync ON members(sync_status);
      CREATE INDEX IF NOT EXISTS idx_payments_sync ON payments(sync_status);
      CREATE INDEX IF NOT EXISTS idx_queue_created ON offline_queue(created_at);
    `);
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Generic CRUD operations
export const insertItem = async (table, item) => {
  try {
    if (!db) await initDatabase();
    
    const columns = Object.keys(item).join(', ');
    const placeholders = Object.keys(item).map(() => '?').join(', ');
    const values = Object.values(item);
    
    await db.runAsync(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );
    
    return true;
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
    return false;
  }
};

export const updateItem = async (table, id, updates) => {
  try {
    if (!db) await initDatabase();
    
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];
    
    await db.runAsync(
      `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      values
    );
    
    return true;
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    return false;
  }
};

export const deleteItem = async (table, id) => {
  try {
    if (!db) await initDatabase();
    
    await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
    
    return true;
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return false;
  }
};

export const getAllItems = async (table) => {
  try {
    if (!db) await initDatabase();
    
    const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
    return rows;
  } catch (error) {
    console.error(`Error getting all from ${table}:`, error);
    return [];
  }
};

export const getItemById = async (table, id) => {
  try {
    if (!db) await initDatabase();
    
    const rows = await db.getAllAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error(`Error getting item from ${table}:`, error);
    return null;
  }
};

export const getItemsBySyncStatus = async (table, syncStatus) => {
  try {
    if (!db) await initDatabase();
    
    const rows = await db.getAllAsync(
      `SELECT * FROM ${table} WHERE sync_status = ?`,
      [syncStatus]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting items by sync status from ${table}:`, error);
    return [];
  }
};

// Specific table operations
export const announcementsDB = {
  getAll: () => getAllItems('announcements'),
  getById: (id) => getItemById('announcements', id),
  insert: (item) => insertItem('announcements', item),
  update: (id, updates) => updateItem('announcements', id, updates),
  delete: (id) => deleteItem('announcements', id),
  getPendingSync: () => getItemsBySyncStatus('announcements', 'pending'),
  clearAll: async () => {
    if (!db) await initDatabase();
    await db.runAsync('DELETE FROM announcements');
  }
};

export const eventsDB = {
  getAll: () => getAllItems('events'),
  getById: (id) => getItemById('events', id),
  insert: (item) => insertItem('events', item),
  update: (id, updates) => updateItem('events', id, updates),
  delete: (id) => deleteItem('events', id),
  getPendingSync: () => getItemsBySyncStatus('events', 'pending'),
  clearAll: async () => {
    if (!db) await initDatabase();
    await db.runAsync('DELETE FROM events');
  }
};

export const membersDB = {
  getAll: () => getAllItems('members'),
  getById: (id) => getItemById('members', id),
  insert: (item) => insertItem('members', item),
  update: (id, updates) => updateItem('members', id, updates),
  delete: (id) => deleteItem('members', id),
  getPendingSync: () => getItemsBySyncStatus('members', 'pending'),
  clearAll: async () => {
    if (!db) await initDatabase();
    await db.runAsync('DELETE FROM members');
  }
};

export const paymentsDB = {
  getAll: () => getAllItems('payments'),
  getById: (id) => getItemById('payments', id),
  insert: (item) => insertItem('payments', item),
  update: (id, updates) => updateItem('payments', id, updates),
  delete: (id) => deleteItem('payments', id),
  getPendingSync: () => getItemsBySyncStatus('payments', 'pending'),
  clearAll: async () => {
    if (!db) await initDatabase();
    await db.runAsync('DELETE FROM payments');
  }
};

export const offlineQueueDB = {
  getAll: () => getAllItems('offline_queue'),
  insert: (item) => insertItem('offline_queue', item),
  update: (id, updates) => updateItem('offline_queue', id, updates),
  delete: (id) => deleteItem('offline_queue', id),
  clearAll: async () => {
    if (!db) await initDatabase();
    await db.runAsync('DELETE FROM offline_queue');
  },
  getPendingItems: async () => {
    if (!db) await initDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM offline_queue ORDER BY created_at ASC'
    );
    return rows;
  }
};

// Clear all data (useful for logout or reset)
export const clearAllData = async () => {
  try {
    if (!db) await initDatabase();
    
    await db.execAsync(`
      DELETE FROM announcements;
      DELETE FROM events;
      DELETE FROM members;
      DELETE FROM payments;
      DELETE FROM offline_queue;
    `);
    
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

export default {
  initDatabase,
  announcementsDB,
  eventsDB,
  membersDB,
  paymentsDB,
  offlineQueueDB,
  clearAllData
};
