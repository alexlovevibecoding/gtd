# GTD Mini - Getting Things Done App

A complete Getting Things Done (GTD) application built with React, featuring IndexedDB persistence, context-based organization, and a clean, minimal interface.

## 🎯 Features

### Core GTD Workflow
- **Capture**: Quick inbox for capturing thoughts and ideas
- **Clarify**: Process items with 2-minute rule guidance
- **Organize**: Sort into Next Actions, Projects, Waiting For, Someday/Maybe, Reference
- **Review**: Weekly review mode for maintaining your system
- **Engage**: Context-based action lists for focused work

### Advanced Features
- **Context Organization**: @Computer, @Calls, @Errands, @Home, @Office, Anywhere
- **Energy Levels**: Low, Medium, High energy task classification
- **Due Dates**: Date tracking with overdue highlighting
- **Time Estimates**: Minutes required for each task
- **Projects**: Link tasks to desired outcomes
- **Waiting For**: Track delegated items and dependencies
- **Search & Filter**: Full-text search across all fields
- **Bulk Operations**: Mass move to Someday, archive completed, clear all

### Technical Features
- **IndexedDB Storage**: Robust browser database with structured queries
- **Data Export/Import**: JSON backup and restore functionality
- **Offline Support**: Works without internet connection
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Instant persistence of changes

## 🚀 Quick Start

### Option 1: Use the Run Script (Recommended)

**On macOS/Linux:**
```bash
./run.sh
```

**On Windows:**
```cmd
run.bat
```

### Option 2: Manual Start

```bash
npm install
npm start
```

The app will open at `http://localhost:3000`

## 📋 Requirements

- Node.js 14+ 
- npm or yarn
- Modern web browser with IndexedDB support

## 🎨 Usage Guide

### Getting Started
1. **Capture** everything on your mind using the input box at the top
2. **Clarify** items in the Clarify tab - decide what they are and what to do
3. **Organize** actionable items into appropriate lists
4. **Review** weekly to keep your system current
5. **Engage** with confidence using context-filtered action lists

### Best Practices
- Process your inbox to zero regularly
- Use contexts to batch similar work
- Set realistic time estimates
- Review and update projects weekly
- Keep reference material organized and searchable

### Data Management
- **Export Data**: Backup your GTD data as JSON
- **Import Data**: Restore from a backup file
- **Clear All**: Reset the entire system (with confirmation)

## 🏗️ Project Structure

```
mygtd/
├── package.json          # Dependencies and scripts
├── run.sh               # Unix/Linux run script
├── run.bat              # Windows run script
├── README.md            # This file
├── public/
│   └── index.html       # HTML template
└── src/
    ├── index.js         # React entry point
    ├── App.js           # Main GTD application
    ├── database.js      # IndexedDB persistence layer
    └── DatabaseControls.js # Export/import/clear functionality
```

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App

### Database Layer

The app uses a custom IndexedDB wrapper that:
- Provides structured storage with indexes
- Falls back to localStorage if IndexedDB unavailable
- Supports full-text search and filtering
- Handles data validation and error recovery
- Enables backup/restore functionality

### Customization

The app is designed to be easily customizable:
- Modify contexts in `src/App.js` 
- Adjust energy levels and time estimates
- Customize the UI styling (uses Tailwind CSS)
- Add new GTD lists or workflows

## 📖 GTD Methodology

This app implements David Allen's Getting Things Done methodology:

1. **Capture** - Collect everything that requires attention
2. **Clarify** - Process what each item means and what action is required
3. **Organize** - Put items in appropriate places based on their meaning
4. **Reflect** - Review your system regularly to maintain trust
5. **Engage** - Take action with confidence

For more information, read "Getting Things Done" by David Allen.

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and enhancement requests.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- David Allen for the GTD methodology
- React team for the excellent framework  
- Tailwind CSS for the utility-first styling approach