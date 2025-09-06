const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class GTDDatabase {
  constructor(dbPath = 'gtd.db') {
    this.dbPath = path.join(__dirname, dbPath);
    this.db = null;
    this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        // Create items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            notes TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'inbox',
            context TEXT NOT NULL DEFAULT 'Anywhere',
            energy TEXT NOT NULL DEFAULT 'Medium',
            time_min INTEGER DEFAULT 15,
            due_date TEXT,
            project TEXT DEFAULT '',
            waiting_for TEXT DEFAULT '',
            done INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Create indexes for performance
          this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
            CREATE INDEX IF NOT EXISTS idx_items_context ON items(context);
            CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(due_date);
            CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
            CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
            CREATE INDEX IF NOT EXISTS idx_items_done ON items(done);
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    });
  }

  // Helper function to generate unique ID
  generateId() {
    return Math.random().toString(36).slice(2, 10);
  }

  // Convert database row to frontend format
  formatItem(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      notes: row.notes || '',
      status: row.status,
      context: row.context,
      energy: row.energy,
      timeMin: row.time_min,
      due: row.due_date || '',
      project: row.project || '',
      waitingFor: row.waiting_for || '',
      done: row.done === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Convert frontend format to database row
  formatForDb(item) {
    return {
      id: item.id,
      title: item.title,
      notes: item.notes || '',
      status: item.status,
      context: item.context,
      energy: item.energy,
      time_min: item.timeMin || 0,
      due_date: item.due || null,
      project: item.project || '',
      waiting_for: item.waitingFor || '',
      done: item.done ? 1 : 0,
      created_at: item.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Promisify database methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // CRUD Operations
  async getAllItems() {
    const rows = await this.all('SELECT * FROM items ORDER BY created_at DESC');
    return rows.map(row => this.formatItem(row));
  }

  async getItemById(id) {
    const row = await this.get('SELECT * FROM items WHERE id = ?', [id]);
    return this.formatItem(row);
  }

  async getItemsByStatus(status) {
    const rows = await this.all('SELECT * FROM items WHERE status = ? ORDER BY created_at DESC', [status]);
    return rows.map(row => this.formatItem(row));
  }

  async getItemsByContext(context) {
    const rows = await this.all('SELECT * FROM items WHERE context = ? ORDER BY created_at DESC', [context]);
    return rows.map(row => this.formatItem(row));
  }

  async getOverdueItems() {
    const rows = await this.all('SELECT * FROM items WHERE due_date IS NOT NULL AND due_date < date("now") AND done = 0');
    return rows.map(row => this.formatItem(row));
  }

  async getItemsDueSoon(days = 3) {
    const rows = await this.all('SELECT * FROM items WHERE due_date IS NOT NULL AND due_date BETWEEN date("now") AND date("now", "+3 days") AND done = 0');
    return rows.map(row => this.formatItem(row));
  }

  async searchItems(query) {
    const searchTerm = `%${query}%`;
    const rows = await this.all('SELECT * FROM items WHERE title LIKE ? OR notes LIKE ? OR project LIKE ? ORDER BY created_at DESC', [searchTerm, searchTerm, searchTerm]);
    return rows.map(row => this.formatItem(row));
  }

  async createItem(itemData) {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const item = {
      ...itemData,
      id,
      createdAt: now,
      updatedAt: now
    };

    const dbItem = this.formatForDb(item);
    
    await this.run(`
      INSERT INTO items (id, title, notes, status, context, energy, time_min, due_date, project, waiting_for, done, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dbItem.id,
      dbItem.title,
      dbItem.notes,
      dbItem.status,
      dbItem.context,
      dbItem.energy,
      dbItem.time_min,
      dbItem.due_date,
      dbItem.project,
      dbItem.waiting_for,
      dbItem.done,
      dbItem.created_at,
      dbItem.updated_at
    ]);

    return this.formatItem(dbItem);
  }

  async updateItem(id, updates) {
    const existing = await this.getItemById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const dbItem = this.formatForDb(updated);

    await this.run(`
      UPDATE items 
      SET title = ?, notes = ?, status = ?, context = ?, energy = ?, time_min = ?, due_date = ?, project = ?, waiting_for = ?, done = ?, updated_at = ?
      WHERE id = ?
    `, [
      dbItem.title,
      dbItem.notes,
      dbItem.status,
      dbItem.context,
      dbItem.energy,
      dbItem.time_min,
      dbItem.due_date,
      dbItem.project,
      dbItem.waiting_for,
      dbItem.done,
      dbItem.updated_at,
      dbItem.id
    ]);

    return this.formatItem(dbItem);
  }

  async deleteItem(id) {
    const result = await this.run('DELETE FROM items WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async deleteItems(ids) {
    const placeholders = ids.map(() => '?').join(',');
    const result = await this.run(`DELETE FROM items WHERE id IN (${placeholders})`, ids);
    return result.changes > 0;
  }

  async deleteAllItems() {
    const result = await this.run('DELETE FROM items');
    return result.changes;
  }

  async getStats() {
    const stats = await this.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN done = 1 THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'inbox' THEN 1 END) as inbox,
        COUNT(CASE WHEN status = 'next' THEN 1 END) as next,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'project' THEN 1 END) as project,
        COUNT(CASE WHEN status = 'someday' THEN 1 END) as someday,
        COUNT(CASE WHEN status = 'reference' THEN 1 END) as reference,
        AVG(time_min) as avg_time
      FROM items
    `);
    
    return {
      total: stats.total,
      completed: stats.completed,
      pending: stats.total - stats.completed,
      statusCounts: {
        inbox: stats.inbox,
        next: stats.next,
        waiting: stats.waiting,
        project: stats.project,
        someday: stats.someday,
        reference: stats.reference
      },
      averageTimeEstimate: Math.round(stats.avg_time || 0)
    };
  }

  // Backup and restore
  async backup() {
    const items = await this.getAllItems();
    return {
      timestamp: new Date().toISOString(),
      version: '1.0',
      items: items
    };
  }

  async restore(backupData) {
    if (!backupData.items || !Array.isArray(backupData.items)) {
      throw new Error('Invalid backup data');
    }

    // Clear existing data and restore
    await this.run('DELETE FROM items');
    
    for (const item of backupData.items) {
      const dbItem = this.formatForDb(item);
      await this.run(`
        INSERT INTO items (id, title, notes, status, context, energy, time_min, due_date, project, waiting_for, done, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dbItem.id,
        dbItem.title,
        dbItem.notes,
        dbItem.status,
        dbItem.context,
        dbItem.energy,
        dbItem.time_min,
        dbItem.due_date,
        dbItem.project,
        dbItem.waiting_for,
        dbItem.done,
        dbItem.created_at,
        dbItem.updated_at
      ]);
    }
    
    return true;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = GTDDatabase;