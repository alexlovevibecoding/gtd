import React, { useState, useEffect } from 'react';

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('gtd-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldUseDark);
    updateTheme(shouldUseDark);
  }, []);

  const updateTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gtd-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gtd-theme', 'light');
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    updateTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track background with gradient */}
      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
          : 'bg-gradient-to-r from-yellow-400 to-orange-500'
      }`} />
      
      {/* Slider */}
      <div className={`relative w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center ${
        isDark ? 'translate-x-3' : '-translate-x-3'
      }`}>
        {/* Icon */}
        <span className="text-xs">
          {isDark ? '🌙' : '☀️'}
        </span>
      </div>
      
      {/* Background stars for dark mode */}
      {isDark && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
          <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-700" />
        </div>
      )}
    </button>
  );
}

export default DarkModeToggle;