import React, { useState } from 'react';
import database from './database';

function DatabaseControls() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      const backup = await database.backup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gtd-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await database.restore(backupData);
      alert('Data imported successfully! Please refresh the page.');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format.');
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear all GTD data? This cannot be undone.')) {
      return;
    }
    
    if (!window.confirm('This will delete ALL your tasks, projects, and notes. Are you absolutely sure?')) {
      return;
    }

    try {
      const allItems = await database.getAllItems();
      await database.deleteItems(Object.keys(allItems));
      alert('All data cleared! Please refresh the page.');
    } catch (error) {
      console.error('Clear failed:', error);
      alert('Failed to clear data. Check console for details.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button
        onClick={exportData}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-card hover:shadow-hover transition-all duration-200 font-medium"
        title="Export all data as JSON backup"
      >
        <span>📥</span>
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>
      
      <label className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 cursor-pointer shadow-card hover:shadow-hover transition-all duration-200 font-medium">
        <span>📤</span>
        <span>{isImporting ? 'Importing...' : 'Import'}</span>
        <input
          type="file"
          accept=".json"
          onChange={importData}
          disabled={isImporting}
          className="hidden"
        />
      </label>
      
      <button
        onClick={clearAllData}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 shadow-card hover:shadow-hover transition-all duration-200 font-medium"
        title="Clear all data - use with caution!"
      >
        <span>🗑️</span>
        <span>Clear</span>
      </button>
    </div>
  );
}

export default DatabaseControls;