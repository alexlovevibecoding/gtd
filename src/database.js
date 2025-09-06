// Simple SQLite database layer for GTD app
// Note: This would typically run on a server, but for simplicity we'll create a browser-compatible version

class GTDDatabase {
  constructor() {
    this.dbName = 'gtd-database';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      // Browser environment - use IndexedDB
      this.db = await this.initIndexedDB();
    } else {
      // Node environment - fallback to localStorage simulation
      this.db = this.initLocalStorage();
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create items store
        if (!db.objectStoreNames.contains('items')) {
          const store = db.createObjectStore('items', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('context', 'context', { unique: false });
          store.createIndex('due', 'due', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  initLocalStorage() {
    // Fallback localStorage implementation
    return {
      get: (key) => {
        const data = localStorage.getItem(`${this.dbName}-${key}`);
        return data ? JSON.parse(data) : null;
      },
      set: (key, value) => {
        localStorage.setItem(`${this.dbName}-${key}`, JSON.stringify(value));
      },
      getAll: () => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(`${this.dbName}-item-`)) {
            const id = key.replace(`${this.dbName}-item-`, '');
            items[id] = JSON.parse(localStorage.getItem(key));
          }
        }
        return items;
      },
      delete: (key) => {
        localStorage.removeItem(`${this.dbName}-${key}`);
      }
    };
  }

  async getAllItems() {
    if (!this.db) await this.init();
    
    if (this.db.objectStoreNames) {
      // IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['items'], 'readonly');
        const store = transaction.objectStore('items');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const items = {};
          request.result.forEach(item => {
            items[item.id] = item;
          });
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // localStorage fallback
      return this.db.getAll();
    }
  }

  async saveItem(item) {
    if (!this.db) await this.init();
    
    if (this.db.objectStoreNames) {
      // IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        const request = store.put(item);
        
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
      });
    } else {
      // localStorage fallback
      this.db.set(`item-${item.id}`, item);
      return item;
    }
  }

  async deleteItem(id) {
    if (!this.db) await this.init();
    
    if (this.db.objectStoreNames) {
      // IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } else {
      // localStorage fallback
      this.db.delete(`item-${id}`);
      return true;
    }
  }

  async deleteItems(ids) {
    if (!this.db) await this.init();
    
    const promises = ids.map(id => this.deleteItem(id));
    return Promise.all(promises);
  }

  async getItemsByStatus(status) {
    const allItems = await this.getAllItems();
    return Object.values(allItems).filter(item => item.status === status);
  }

  async getItemsByContext(context) {
    const allItems = await this.getAllItems();
    return Object.values(allItems).filter(item => item.context === context);
  }

  async getOverdueItems() {
    const allItems = await this.getAllItems();
    const now = new Date();
    return Object.values(allItems).filter(item => {
      if (!item.due) return false;
      return new Date(item.due) < now;
    });
  }

  async getItemsDueSoon(days = 3) {
    const allItems = await this.getAllItems();
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return Object.values(allItems).filter(item => {
      if (!item.due) return false;
      const dueDate = new Date(item.due);
      return dueDate >= now && dueDate <= futureDate;
    });
  }

  async searchItems(query) {
    const allItems = await this.getAllItems();
    const searchQuery = query.toLowerCase();
    
    return Object.values(allItems).filter(item => {
      return item.title.toLowerCase().includes(searchQuery) ||
             (item.notes && item.notes.toLowerCase().includes(searchQuery)) ||
             (item.project && item.project.toLowerCase().includes(searchQuery));
    });
  }

  async backup() {
    const allItems = await this.getAllItems();
    return {
      timestamp: new Date().toISOString(),
      version: this.version,
      items: allItems
    };
  }

  async restore(backupData) {
    if (!backupData.items) throw new Error('Invalid backup data');
    
    // Clear existing data
    const existingItems = await this.getAllItems();
    await this.deleteItems(Object.keys(existingItems));
    
    // Restore items
    const promises = Object.values(backupData.items).map(item => this.saveItem(item));
    return Promise.all(promises);
  }
}

// Create singleton instance
const database = new GTDDatabase();

export default database;