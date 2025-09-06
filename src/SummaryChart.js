import React, { useMemo } from 'react';

function SummaryChart({ items }) {
  const stats = useMemo(() => {
    const itemsArray = Object.values(items || {});
    
    // Basic counts
    const total = itemsArray.length;
    const completed = itemsArray.filter(item => item.done).length;
    const pending = total - completed;
    
    // Status breakdown
    const statusCounts = {
      inbox: itemsArray.filter(i => i.status === 'inbox').length,
      next: itemsArray.filter(i => i.status === 'next').length,
      waiting: itemsArray.filter(i => i.status === 'waiting').length,
      project: itemsArray.filter(i => i.status === 'project').length,
      someday: itemsArray.filter(i => i.status === 'someday').length,
      reference: itemsArray.filter(i => i.status === 'reference').length,
    };
    
    // Context breakdown
    const contextCounts = itemsArray.reduce((acc, item) => {
      acc[item.context] = (acc[item.context] || 0) + 1;
      return acc;
    }, {});
    
    // Energy breakdown
    const energyCounts = itemsArray.reduce((acc, item) => {
      acc[item.energy] = (acc[item.energy] || 0) + 1;
      return acc;
    }, {});
    
    // Due dates
    const now = new Date();
    const overdue = itemsArray.filter(item => {
      if (!item.due || item.done) return false;
      return new Date(item.due) < now;
    }).length;
    
    const dueSoon = itemsArray.filter(item => {
      if (!item.due || item.done) return false;
      const dueDate = new Date(item.due);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= threeDaysFromNow;
    }).length;
    
    // Productivity metrics
    const averageTimeEstimate = itemsArray.length > 0 
      ? Math.round(itemsArray.reduce((sum, item) => sum + (item.timeMin || 0), 0) / itemsArray.length)
      : 0;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      pending,
      statusCounts,
      contextCounts,
      energyCounts,
      overdue,
      dueSoon,
      averageTimeEstimate,
      completionRate
    };
  }, [items]);

  const StatCard = ({ title, value, subtitle, color = "blue", icon }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 border border-${color}-200 dark:border-${color}-700 rounded-2xl p-6 shadow-card hover:shadow-hover transition-all duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-medium text-${color}-700 dark:text-${color}-300`}>{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold text-${color}-900 dark:text-${color}-100 mb-1`}>{value}</div>
      {subtitle && <div className={`text-sm text-${color}-600 dark:text-${color}-400`}>{subtitle}</div>}
    </div>
  );

  const ProgressRing = ({ percentage, color = "blue", size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`text-${color}-500 transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  const ChartBar = ({ label, value, maxValue, color = "blue", emoji }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {emoji && <span className="text-lg flex-shrink-0">{emoji}</span>}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-500 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-8 text-right">{value}</span>
        </div>
      </div>
    );
  };

  if (stats.total === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-card border border-white/60 dark:border-gray-700/60 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Data Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">Start adding tasks to see your productivity insights!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Tasks" 
          value={stats.total} 
          subtitle="All items"
          color="blue" 
          icon="📋"
        />
        <StatCard 
          title="Completed" 
          value={stats.completed} 
          subtitle={`${stats.completionRate}% done`}
          color="green" 
          icon="✅"
        />
        <StatCard 
          title="Overdue" 
          value={stats.overdue} 
          subtitle="Need attention"
          color="red" 
          icon="⚠️"
        />
        <StatCard 
          title="Due Soon" 
          value={stats.dueSoon} 
          subtitle="Next 3 days"
          color="amber" 
          icon="⏰"
        />
      </div>

      {/* Progress and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Progress */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-white/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Completion Rate</h3>
          <div className="flex justify-center">
            <ProgressRing percentage={stats.completionRate} color="green" />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-white/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">GTD Lists</h3>
          <div className="space-y-2">
            <ChartBar label="Inbox" value={stats.statusCounts.inbox} maxValue={stats.total} color="gray" emoji="📥" />
            <ChartBar label="Next Actions" value={stats.statusCounts.next} maxValue={stats.total} color="blue" emoji="⚡" />
            <ChartBar label="Waiting For" value={stats.statusCounts.waiting} maxValue={stats.total} color="yellow" emoji="⏳" />
            <ChartBar label="Projects" value={stats.statusCounts.project} maxValue={stats.total} color="purple" emoji="🎯" />
            <ChartBar label="Someday/Maybe" value={stats.statusCounts.someday} maxValue={stats.total} color="indigo" emoji="💭" />
            <ChartBar label="Reference" value={stats.statusCounts.reference} maxValue={stats.total} color="green" emoji="📚" />
          </div>
        </div>

        {/* Context Breakdown */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-white/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contexts</h3>
          <div className="space-y-2">
            {Object.entries(stats.contextCounts).map(([context, count]) => {
              const emojis = {
                '@Computer': '💻',
                '@Calls': '📞', 
                '@Errands': '🚗',
                '@Home': '🏠',
                '@Office': '🏢',
                'Anywhere': '🌎'
              };
              return (
                <ChartBar 
                  key={context} 
                  label={context} 
                  value={count} 
                  maxValue={stats.total} 
                  color="cyan" 
                  emoji={emojis[context]} 
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-white/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Energy Levels</h3>
          <div className="space-y-2">
            <ChartBar label="High Energy" value={stats.energyCounts.High || 0} maxValue={stats.total} color="red" emoji="🔥" />
            <ChartBar label="Medium Energy" value={stats.energyCounts.Medium || 0} maxValue={stats.total} color="yellow" emoji="⚡" />
            <ChartBar label="Low Energy" value={stats.energyCounts.Low || 0} maxValue={stats.total} color="green" emoji="🌱" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">Avg. Time</h3>
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {stats.averageTimeEstimate}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">minutes per task</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Pending</h3>
          <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.pending}
          </div>
          <div className="text-sm text-indigo-700 dark:text-indigo-300">tasks remaining</div>
        </div>
      </div>
    </div>
  );
}

export default SummaryChart;