const express = require('express');
const cors = require('cors');
const GTDDatabase = require('./database');

const app = express();
const port = process.env.PORT || 3001;

// Initialize database
const db = new GTDDatabase();
let dbReady = false;

// Initialize database asynchronously
(async () => {
  try {
    await db.init();
    dbReady = true;
    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database ready check middleware
app.use((req, res, next) => {
  if (!dbReady && req.path !== '/api/health') {
    return res.status(503).json({ error: 'Database not ready' });
  }
  next();
});

// Error handler
const handleError = (res, error, message = 'Internal server error') => {
  console.error(error);
  res.status(500).json({ error: message, details: error.message });
};

// Routes

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.getAllItems();
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to fetch items');
  }
});

// Get item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await db.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ item });
  } catch (error) {
    handleError(res, error, 'Failed to fetch item');
  }
});

// Get items by status
app.get('/api/items/status/:status', async (req, res) => {
  try {
    const items = await db.getItemsByStatus(req.params.status);
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to fetch items by status');
  }
});

// Get items by context
app.get('/api/items/context/:context', async (req, res) => {
  try {
    const items = await db.getItemsByContext(req.params.context);
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to fetch items by context');
  }
});

// Get overdue items
app.get('/api/items/overdue', async (req, res) => {
  try {
    const items = await db.getOverdueItems();
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to fetch overdue items');
  }
});

// Get items due soon
app.get('/api/items/due-soon', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 3;
    const items = await db.getItemsDueSoon(days);
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to fetch items due soon');
  }
});

// Search items
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const items = await db.searchItems(query);
    res.json({ items });
  } catch (error) {
    handleError(res, error, 'Failed to search items');
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ stats });
  } catch (error) {
    handleError(res, error, 'Failed to fetch statistics');
  }
});

// Create item
app.post('/api/items', async (req, res) => {
  try {
    const { title, notes, status, context, energy, timeMin, due, project, waitingFor } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const itemData = {
      title: title.trim(),
      notes: notes || '',
      status: status || 'inbox',
      context: context || 'Anywhere',
      energy: energy || 'Medium',
      timeMin: timeMin || 15,
      due: due || '',
      project: project || '',
      waitingFor: waitingFor || '',
      done: false
    };

    const item = await db.createItem(itemData);
    res.status(201).json({ item });
  } catch (error) {
    handleError(res, error, 'Failed to create item');
  }
});

// Update item
app.put('/api/items/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate and sanitize updates
    const allowedFields = ['title', 'notes', 'status', 'context', 'energy', 'timeMin', 'due', 'project', 'waitingFor', 'done'];
    const validUpdates = {};
    
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        validUpdates[field] = updates[field];
      }
    }
    
    if (validUpdates.title !== undefined) {
      validUpdates.title = validUpdates.title?.trim() || '';
      if (!validUpdates.title) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
    }

    const item = await db.updateItem(req.params.id, validUpdates);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ item });
  } catch (error) {
    handleError(res, error, 'Failed to update item');
  }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const success = await db.deleteItem(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'Failed to delete item');
  }
});

// Bulk delete items
app.delete('/api/items', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }
    
    await db.deleteItems(ids);
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    handleError(res, error, 'Failed to delete items');
  }
});

// Clear all items
app.delete('/api/items/all', async (req, res) => {
  try {
    const deletedCount = await db.deleteAllItems();
    res.json({ success: true, deleted: deletedCount });
  } catch (error) {
    handleError(res, error, 'Failed to clear all items');
  }
});

// Export backup
app.get('/api/backup', async (req, res) => {
  try {
    const backup = await db.backup();
    res.json({ backup });
  } catch (error) {
    handleError(res, error, 'Failed to create backup');
  }
});

// Import backup
app.post('/api/backup/restore', async (req, res) => {
  try {
    const { backup } = req.body;
    if (!backup) {
      return res.status(400).json({ error: 'Backup data is required' });
    }
    
    await db.restore(backup);
    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to restore backup');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    version: '1.0.0'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 GTD API Server running on port ${port}`);
  console.log(`📊 Database: SQLite`);
  console.log(`🌐 API endpoints available at http://localhost:${port}/api`);
});

module.exports = app;