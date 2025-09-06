// API client for SQLite backend
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class APIClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/health');
  }

  // Items CRUD
  async getAllItems() {
    const response = await this.request('/items');
    return response.items || [];
  }

  async getItemById(id) {
    const response = await this.request(`/items/${id}`);
    return response.item;
  }

  async createItem(itemData) {
    const response = await this.request('/items', {
      method: 'POST',
      body: itemData,
    });
    return response.item;
  }

  async updateItem(id, updates) {
    const response = await this.request(`/items/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return response.item;
  }

  async deleteItem(id) {
    const response = await this.request(`/items/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  async deleteItems(ids) {
    const response = await this.request('/items', {
      method: 'DELETE',
      body: { ids },
    });
    return response.success;
  }

  async clearAllItems() {
    const response = await this.request('/items/all', {
      method: 'DELETE',
    });
    return response.deleted;
  }

  // Filtered queries
  async getItemsByStatus(status) {
    const response = await this.request(`/items/status/${status}`);
    return response.items || [];
  }

  async getItemsByContext(context) {
    const response = await this.request(`/items/context/${encodeURIComponent(context)}`);
    return response.items || [];
  }

  async getOverdueItems() {
    const response = await this.request('/items/overdue');
    return response.items || [];
  }

  async getItemsDueSoon(days = 3) {
    const response = await this.request(`/items/due-soon?days=${days}`);
    return response.items || [];
  }

  async searchItems(query) {
    const response = await this.request(`/search?q=${encodeURIComponent(query)}`);
    return response.items || [];
  }

  // Statistics
  async getStats() {
    const response = await this.request('/stats');
    return response.stats;
  }

  // Backup and restore
  async exportBackup() {
    const response = await this.request('/backup');
    return response.backup;
  }

  async importBackup(backupData) {
    const response = await this.request('/backup/restore', {
      method: 'POST',
      body: { backup: backupData },
    });
    return response.success;
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;