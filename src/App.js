import React, { useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import apiClient from "./api";
import SummaryChart from "./SummaryChart";
import DarkModeToggle from "./DarkModeToggle";

// ===============================
// GTD MINI — Single-file React app
// ===============================
// Features
// - Capture inbox
// - Clarify: actionable? next action, 2‑minute rule, delegate/defer
// - Organize into lists: Next Actions (by context), Waiting For, Projects, Someday/Maybe, Reference
// - Simple "Calendar" via due date
// - Weekly Review mode
// - LocalStorage persistence
// - Quick search & filters
//
// Tailwind-friendly, no external UI deps.

// ---------- Types ----------
const contexts = ["@Computer", "@Calls", "@Errands", "@Home", "@Office", "Anywhere"];
const energies = ["Low", "Medium", "High"];

/** @typedef {Object} Item */
/** @typedef {"inbox"|"next"|"waiting"|"project"|"someday"|"reference"} Status */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const initialState = /** @type {{items: Record<string, any>}} */({ items: {} });

// ---------- Reducer ----------
function reducer(state, action) {
  switch (action.type) {
    case "load":
      return action.state;
    case "add": {
      const id = uid();
      const now = new Date().toISOString();
      const title = action.title?.trim();
      if (!title) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [id]: {
            id,
            title,
            notes: "",
            status: "inbox",
            createdAt: now,
            updatedAt: now,
            context: "Anywhere",
            energy: "Medium",
            timeMin: 15,
            due: "",
            project: "",
            waitingFor: "",
            done: false,
          },
        },
      };
    }
    case "update": {
      const { id, patch } = action;
      const cur = state.items[id];
      if (!cur || !patch) return state;
      
      const validatedPatch = {};
      if (patch.title !== undefined) validatedPatch.title = patch.title?.trim() || cur.title;
      if (patch.notes !== undefined) validatedPatch.notes = patch.notes || "";
      if (patch.context !== undefined && contexts.includes(patch.context)) validatedPatch.context = patch.context;
      if (patch.energy !== undefined && energies.includes(patch.energy)) validatedPatch.energy = patch.energy;
      if (patch.timeMin !== undefined) validatedPatch.timeMin = Math.max(0, Number(patch.timeMin) || 0);
      if (patch.due !== undefined) validatedPatch.due = patch.due || "";
      if (patch.project !== undefined) validatedPatch.project = patch.project?.trim() || "";
      if (patch.waitingFor !== undefined) validatedPatch.waitingFor = patch.waitingFor?.trim() || "";
      
      return {
        ...state,
        items: {
          ...state.items,
          [id]: { ...cur, ...validatedPatch, updatedAt: new Date().toISOString() },
        },
      };
    }
    case "move": {
      const { id, status } = action;
      const cur = state.items[id];
      if (!cur) return state;
      return {
        ...state,
        items: { ...state.items, [id]: { ...cur, status, updatedAt: new Date().toISOString() } },
      };
    }
    case "delete": {
      const copy = { ...state.items };
      for (const id of action.ids) delete copy[id];
      return { ...state, items: copy };
    }
    case "toggleDone": {
      const cur = state.items[action.id];
      if (!cur) return state;
      return {
        ...state,
        items: { ...state.items, [action.id]: { ...cur, done: !cur.done, updatedAt: new Date().toISOString() } },
      };
    }
    case "load_item": {
      return {
        ...state,
        items: {
          ...state.items,
          [action.item.id]: action.item
        }
      };
    }
    default:
      return state;
  }
}

// ---------- SQLite API Persistence ----------
function useSQLiteReducer(red, init) {
  const [state, dispatch] = useReducer(red, init);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const items = await apiClient.getAllItems();
        const itemsMap = {};
        items.forEach(item => {
          itemsMap[item.id] = item;
        });
        dispatch({ type: "load", state: { items: itemsMap } });
      } catch (error) {
        console.error('Failed to load from API:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Enhanced dispatch with API persistence
  const apiDispatch = async (action) => {
    try {
      switch (action.type) {
        case "add": {
          const title = action.title?.trim();
          if (!title) return;

          const itemData = {
            title,
            notes: "",
            status: "inbox",
            context: "Anywhere",
            energy: "Medium",
            timeMin: 15,
            due: "",
            project: "",
            waitingFor: "",
            done: false,
          };

          const newItem = await apiClient.createItem(itemData);
          dispatch({ type: "load_item", item: newItem });
          // Note: Notification would be added here but we don't have access to addNotification in the reducer
          break;
        }
        
        case "update": {
          const { id, patch } = action;
          const currentItem = state.items[id];
          if (!currentItem || !patch) return;

          const validatedPatch = {};
          if (patch.title !== undefined) validatedPatch.title = patch.title?.trim() || currentItem.title;
          if (patch.notes !== undefined) validatedPatch.notes = patch.notes || "";
          if (patch.context !== undefined && contexts.includes(patch.context)) validatedPatch.context = patch.context;
          if (patch.energy !== undefined && energies.includes(patch.energy)) validatedPatch.energy = patch.energy;
          if (patch.timeMin !== undefined) validatedPatch.timeMin = Math.max(0, Number(patch.timeMin) || 0);
          if (patch.due !== undefined) validatedPatch.due = patch.due || "";
          if (patch.project !== undefined) validatedPatch.project = patch.project?.trim() || "";
          if (patch.waitingFor !== undefined) validatedPatch.waitingFor = patch.waitingFor?.trim() || "";

          const updatedItem = await apiClient.updateItem(id, validatedPatch);
          dispatch({ type: "load_item", item: updatedItem });
          break;
        }

        case "move": {
          const { id, status } = action;
          const currentItem = state.items[id];
          if (!currentItem) return;

          const updatedItem = await apiClient.updateItem(id, { status });
          dispatch({ type: "load_item", item: updatedItem });
          break;
        }

        case "toggleDone": {
          const currentItem = state.items[action.id];
          if (!currentItem) return;

          const updatedItem = await apiClient.updateItem(action.id, { done: !currentItem.done });
          dispatch({ type: "load_item", item: updatedItem });
          break;
        }

        case "delete": {
          await apiClient.deleteItems(action.ids);
          dispatch(action);
          break;
        }

        default:
          dispatch(action);
          break;
      }
    } catch (error) {
      console.error('API operation failed:', error);
      // Still dispatch to update UI, but log error
      dispatch(action);
    }
  };

  return [state, apiDispatch, isLoading];
}

// ---------- Notification System ----------
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    success: "bg-green-100 border-green-200 text-green-800",
    error: "bg-red-100 border-red-200 text-red-800",
    info: "bg-blue-100 border-blue-200 text-blue-800",
    warning: "bg-yellow-100 border-yellow-200 text-yellow-800"
  };

  const icons = {
    success: "✓",
    error: "✗",
    info: "ℹ",
    warning: "⚠"
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg ${typeStyles[type]} transform transition-all duration-300 animate-bounce`}>
      <span className="text-lg">{icons[type]}</span>
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = "success") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notificationContextValue = useMemo(() => ({
    addNotification
  }), [addNotification]);

  return (
    <NotificationContext.Provider value={notificationContextValue}>
      {children}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

const NotificationContext = React.createContext();
const useNotifications = () => useContext(NotificationContext);

// ---------- Modal System ----------
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-dark-100 px-6 py-6 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4">
                {title}
              </h3>
              <div className="mt-2">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", type = "danger" }) {
  const confirmButtonClass = type === "danger" 
    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" 
    : "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        {message}
      </p>
      <div className="flex gap-3 justify-end">
        <Button 
          kind="ghost" 
          onClick={onClose}
          size="sm"
        >
          {cancelText}
        </Button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "danger"
  });

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure?",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        type: options.type || "danger",
        onConfirm: () => {
          resolve(true);
        }
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const confirmContextValue = useMemo(() => ({
    showConfirm
  }), [showConfirm]);

  return (
    <ConfirmContext.Provider value={confirmContextValue}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </ConfirmContext.Provider>
  );
}

const ConfirmContext = React.createContext();
const useConfirm = () => useContext(ConfirmContext);

// ---------- Small UI helpers ----------
function Badge({ children }) {
  return <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{children}</span>;
}
function Section({ title, right, children }) {
  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          {title}
        </h2>
        {right}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
function Button({ children, onClick, kind = "default", size = "default", title }) {
  const baseClasses = "font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeClasses = {
    xs: "px-2 py-1 text-xs rounded-lg",
    sm: "px-3 py-1.5 text-sm rounded-lg", 
    default: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl"
  };
  
  const kindStyles = {
    primary: "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-card hover:shadow-hover focus:ring-primary-500 transform hover:scale-105",
    secondary: "bg-white/80 dark:bg-dark-200/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-300 hover:bg-white dark:hover:bg-dark-200 hover:shadow-card dark:hover:shadow-dark-card backdrop-blur-sm focus:ring-primary-500",
    ghost: "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-dark-300/50 backdrop-blur-sm rounded-lg focus:ring-primary-500",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-card hover:shadow-hover focus:ring-red-500 transform hover:scale-105",
    default: "bg-white/60 dark:bg-dark-200/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-white/40 dark:border-dark-300/40 hover:bg-white/80 dark:hover:bg-dark-200/80 hover:shadow-card dark:hover:shadow-dark-card focus:ring-primary-500"
  };
  
  return (
    <button 
      title={title} 
      onClick={onClick} 
      className={`${baseClasses} ${sizeClasses[size]} ${kindStyles[kind]}`}
    >
      {children}
    </button>
  );
}
function Input(props) { 
  return (
    <input 
      {...props} 
      className={`w-full rounded-xl border-0 bg-white/80 dark:bg-dark-200/80 backdrop-blur-sm px-4 py-3 text-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 shadow-card dark:shadow-dark-card focus:shadow-hover dark:focus:shadow-dark-hover focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:bg-white dark:focus:bg-dark-200 transition-all duration-200 ${props.className||""}`} 
    />
  );
}

function Textarea(props) { 
  return (
    <textarea 
      {...props} 
      className={`w-full rounded-xl border-0 bg-white/80 dark:bg-dark-200/80 backdrop-blur-sm px-4 py-3 text-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 shadow-card dark:shadow-dark-card focus:shadow-hover dark:focus:shadow-dark-hover focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:bg-white dark:focus:bg-dark-200 transition-all duration-200 resize-none ${props.className||""}`} 
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select 
      value={value} 
      onChange={e=>onChange(e.target.value)} 
      className="w-full rounded-xl border-0 bg-white/80 dark:bg-dark-200/80 backdrop-blur-sm px-4 py-3 text-sm text-gray-900 dark:text-gray-100 shadow-card dark:shadow-dark-card focus:shadow-hover dark:focus:shadow-dark-hover focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:bg-white dark:focus:bg-dark-200 transition-all duration-200 cursor-pointer"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ---------- Item Card ----------
function ItemCard({ item, onUpdate, onMove, onToggleDone, onDelete }) {
  const isOverdue = item.due && new Date(item.due) < new Date();
  const energyColors = {
    'Low': 'bg-green-100 text-green-800 border-green-200',
    'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    'High': 'bg-red-100 text-red-800 border-red-200'
  };
  
  const contextEmojis = {
    '@Computer': '💻',
    '@Calls': '📞',
    '@Errands': '🚗',
    '@Home': '🏠',
    '@Office': '🏢',
    'Anywhere': '🌎'
  };

  return (
    <div className={`group relative bg-white/80 dark:bg-dark-100/80 backdrop-blur-sm rounded-2xl shadow-card dark:shadow-dark-card hover:shadow-hover dark:hover:shadow-dark-hover transition-all duration-300 border border-white/60 dark:border-dark-300/60 ${
      item.done ? 'opacity-75' : ''
    } ${isOverdue ? 'ring-2 ring-red-200 dark:ring-red-400 bg-red-50/50 dark:bg-red-900/20' : ''}`}>
      
      {/* Priority indicator */}
      {item.energy === 'High' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 mt-1">
            <input 
              type="checkbox" 
              checked={!!item.done} 
              onChange={()=>onToggleDone(item.id)} 
              className="w-5 h-5 rounded-lg border-2 border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 focus:ring-2 transition-all"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight mb-2 ${
              item.done ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
            }`}>
              {item.title}
            </h3>
            
            {item.notes && (
              <div className="text-gray-600 dark:text-gray-300 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
                {item.notes}
              </div>
            )}
            
            {/* Tags and metadata */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <span>{contextEmojis[item.context] || '📍'}</span>
                {item.context}
              </span>
              
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${energyColors[item.energy] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {item.energy} energy
              </span>
              
              {item.timeMin > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  <span>⏱️</span>
                  {item.timeMin}min
                </span>
              )}
              
              {item.due && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                  isOverdue 
                    ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' 
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  <span>📅</span>
                  {new Date(item.due).toLocaleDateString()}
                </span>
              )}
              
              {item.project && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span>🎯</span>
                  {item.project}
                </span>
              )}
              
              {item.status === "waiting" && item.waitingFor && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  <span>⏳</span>
                  {item.waitingFor}
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Updated {new Date(item.updatedAt).toLocaleDateString()} at {new Date(item.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex flex-wrap gap-1 max-w-xs">
              {item.status !== "inbox" && (
                <Button kind="ghost" size="xs" title="Send to Inbox" onClick={()=>onMove(item.id, "inbox")}>
                  📥
                </Button>
              )}
              <Button kind="ghost" size="xs" onClick={()=>onMove(item.id, "next")} title="Next Action">⚡</Button>
              <Button kind="ghost" size="xs" onClick={()=>onMove(item.id, "waiting")} title="Waiting For">⏳</Button>
              <Button kind="ghost" size="xs" onClick={()=>onMove(item.id, "project")} title="Project">🎯</Button>
              <Button kind="ghost" size="xs" onClick={()=>onMove(item.id, "someday")} title="Someday/Maybe">💭</Button>
              <Button kind="ghost" size="xs" onClick={()=>onMove(item.id, "reference")} title="Reference">📚</Button>
              <Button kind="danger" size="xs" title="Delete" onClick={()=>onDelete?.(item.id)}>🗑️</Button>
            </div>
          </div>
        </div>
        
        {/* Quick edit form - collapsible */}
        <details className="group/details">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <span className="select-none">✏️ Quick Edit</span>
          </summary>
          <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-dark-300 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input 
                placeholder="Task title"
                defaultValue={item.title} 
                onBlur={e=>onUpdate(item.id, { title: e.target.value })} 
              />
              <Select 
                value={item.context} 
                onChange={v=>onUpdate(item.id,{context:v})} 
                options={contexts} 
              />
              <Select 
                value={item.energy} 
                onChange={v=>onUpdate(item.id,{energy:v})} 
                options={energies} 
              />
              <Input 
                type="number" 
                placeholder="Minutes"
                min={0} 
                step={5} 
                value={item.timeMin||0} 
                onChange={e=>onUpdate(item.id,{timeMin: Number(e.target.value)})} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                type="date" 
                value={item.due||""} 
                onChange={e=>onUpdate(item.id,{due: e.target.value})} 
              />
              <Input 
                placeholder="Project (optional)" 
                value={item.project||""} 
                onChange={e=>onUpdate(item.id,{project:e.target.value})} 
              />
            </div>
            
            {item.status === "waiting" && (
              <Input 
                placeholder="Waiting for whom?" 
                value={item.waitingFor||""} 
                onChange={e=>onUpdate(item.id,{waitingFor:e.target.value})} 
              />
            )}
            
            <Textarea 
              rows={3} 
              placeholder="Notes and details…" 
              defaultValue={item.notes} 
              onBlur={e=>onUpdate(item.id,{notes: e.target.value})} 
            />
          </div>
        </details>
      </div>
    </div>
  );
}

// ---------- Capture Bar ----------
function CaptureBar({ onAdd }) {
  const [text, setText] = useState("");
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Input
          placeholder="✨ Capture anything on your mind… (Press Enter to add)"
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=>{
            if (e.key === "Enter" && text.trim()) { onAdd(text); setText(""); }
          }}
          className="pr-12"
        />
        {text && (
          <button
            onClick={() => setText("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      <Button 
        kind="primary" 
        onClick={()=>{ if (text.trim()) { onAdd(text); setText(""); } }}
        disabled={!text.trim()}
        className={!text.trim() ? "opacity-50 cursor-not-allowed" : ""}
      >
        <span className="flex items-center gap-2">
          <span>➕</span>
          <span className="hidden sm:inline">Add Task</span>
        </span>
      </Button>
    </div>
  );
}

// ---------- Filters ----------
function Filters({ query, setQuery, context, setContext, energy, setEnergy, onlyDue, setOnlyDue }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)} className="md:w-64" />
      <Select value={context} onChange={setContext} options={["All", ...contexts]} />
      <Select value={energy} onChange={setEnergy} options={["All", ...energies]} />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={onlyDue} onChange={e=>setOnlyDue(e.target.checked)} />
        Only due soon
      </label>
    </div>
  );
}

// ---------- Pages ----------
function List({ items, ...handlers }) {
  if (items.length === 0) return <div className="text-sm text-slate-500">Nothing here yet.</div>;
  return (
    <div className="grid gap-3">
      {items.map(item => (
        <ItemCard key={item.id} item={item} {...handlers} />
      ))}
    </div>
  );
}

function WeeklyReview({ items, onMove }) {
  const ordered = useMemo(() => items.sort((a,b)=>new Date(a.updatedAt)-new Date(b.updatedAt)), [items]);
  const [i, setI] = useState(0);
  const cur = ordered[i];
  if (!cur) return <div className="text-sm text-slate-500">No items to review. Nice!</div>;
  return (
    <div className="space-y-4">
      <div className="text-slate-700">Step {i+1} / {ordered.length}</div>
      <ItemCard item={cur} onMove={(id, st)=>{ onMove(id, st); setI(Math.min(i+1, ordered.length-1)); }} onUpdate={()=>{}} onToggleDone={()=>{}} />
      <div className="flex gap-2">
        <Button onClick={()=>setI(Math.max(0, i-1))}>Back</Button>
        <Button kind="primary" onClick={()=>setI(Math.min(i+1, ordered.length-1))}>Next</Button>
      </div>
    </div>
  );
}

// ---------- Root App ----------
function AppContent() {
  const [state, dispatch, isLoading] = useSQLiteReducer(reducer, initialState);
  const [tab, setTab] = useState("Summary");
  const [query, setQuery] = useState("");
  const [ctxFilter, setCtxFilter] = useState("All");
  const [engFilter, setEngFilter] = useState("All");
  const [onlyDue, setOnlyDue] = useState(false);
  const { addNotification } = useNotifications();
  const { showConfirm } = useConfirm();

  const items = Object.values(state.items);
  const matchQuery = (it) => !query || it.title.toLowerCase().includes(query.toLowerCase()) || (it.notes||"").toLowerCase().includes(query.toLowerCase());
  const matchCtx = (it) => ctxFilter === "All" || it.context === ctxFilter;
  const matchEng = (it) => engFilter === "All" || it.energy === engFilter;
  const matchDue = (it) => {
    if (!onlyDue) return true;
    if (!it.due) return false;
    const dueDate = new Date(it.due);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return dueDate <= threeDaysFromNow;
  };

  const handlers = {
    onUpdate: (id, patch) => dispatch({ type: "update", id, patch }),
    onMove: (id, status) => {
      const item = state.items[id];
      dispatch({ type: "move", id, status });
      if (item) {
        const statusNames = {
          inbox: "Inbox",
          next: "Next Actions",
          waiting: "Waiting For",
          project: "Projects",
          someday: "Someday/Maybe",
          reference: "Reference"
        };
        addNotification(`Moved "${item.title}" to ${statusNames[status] || status}`, "info");
      }
    },
    onToggleDone: (id) => {
      const item = state.items[id];
      dispatch({ type: "toggleDone", id });
      if (item) {
        addNotification(
          item.done ? `Unmarked "${item.title}"` : `Completed "${item.title}"`, 
          "success"
        );
      }
    },
    onDelete: async (id) => {
      const item = state.items[id];
      if (!item) return;
      
      const confirmed = await showConfirm({
        title: "Delete Item",
        message: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel"
      });
      
      if (confirmed) {
        dispatch({ type: "delete", ids: [id] });
        addNotification(`Deleted "${item.title}"`, "success");
      }
    },
  };

  const counts = useMemo(() => ({
    inbox: items.filter(i=>i.status==="inbox").length,
    next: items.filter(i=>i.status==="next").length,
    waiting: items.filter(i=>i.status==="waiting").length,
    project: items.filter(i=>i.status==="project").length,
    someday: items.filter(i=>i.status==="someday").length,
    reference: items.filter(i=>i.status==="reference").length,
  }), [items]);

  // Derived lists
  const inbox = items.filter(i=>i.status==="inbox" && matchQuery(i));
  const next = items.filter(i=>i.status==="next" && matchQuery(i) && matchCtx(i) && matchEng(i) && matchDue(i));
  const waiting = items.filter(i=>i.status==="waiting" && matchQuery(i));
  const projects = items.filter(i=>i.status==="project" && matchQuery(i));
  const someday = items.filter(i=>i.status==="someday" && matchQuery(i));
  const reference = items.filter(i=>i.status==="reference" && matchQuery(i));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-300 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Loading GTD data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-dark-50 dark:via-dark-100 dark:to-dark-200 transition-colors duration-300">
      {/* Modern Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-dark-100/70 border-b border-white/20 dark:border-dark-300/30 shadow-soft dark:shadow-dark-card transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-card">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  GTD Mini
                </h1>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-3">
              <DarkModeToggle />
              <div className="hidden md:flex items-center gap-1 bg-white/60 dark:bg-dark-200/60 rounded-xl p-2 shadow-card dark:shadow-dark-card">
                {[
                  ["Summary", null, "📊"],
                  ["Inbox", counts.inbox, "📥"],
                  ["Clarify", null, "🤔"],
                  ["Next", counts.next, "⚡"],
                  ["Waiting", counts.waiting, "⏳"],
                  ["Projects", counts.project, "🎯"],
                  ["Someday", counts.someday, "💭"],
                  ["Reference", counts.reference, "📚"],
                  ["Review", null, "🔍"],
                ].map(([name, count, emoji]) => (
                  <button 
                    key={name} 
                    onClick={()=>setTab(name)} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      tab === name
                        ? "bg-primary-500 text-white shadow-card transform scale-105"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/80 dark:hover:bg-dark-300/50"
                    }`}
                  >
                    <span className="text-xs">{emoji}</span>
                    <span>{name}</span>
                    {count != null && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                        tab === name ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Mobile Navigation */}
              <div className="md:hidden">
                <select 
                  value={tab} 
                  onChange={(e) => setTab(e.target.value)}
                  className="bg-white/80 dark:bg-dark-200/80 border border-white/20 dark:border-dark-300/30 rounded-lg px-3 py-2 text-sm font-medium backdrop-blur-sm text-gray-900 dark:text-gray-100"
                >
                  {[
                    ["Summary", null],
                    ["Inbox", counts.inbox],
                    ["Clarify", null],
                    ["Next", counts.next],
                    ["Waiting", counts.waiting],
                    ["Projects", counts.project],
                    ["Someday", counts.someday],
                    ["Reference", counts.reference],
                    ["Review", null],
                  ].map(([name, count]) => (
                    <option key={name} value={name}>
                      {name}{count != null ? ` (${count})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </nav>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Capture always visible */}
        <Section title="Capture">
          <CaptureBar onAdd={(title)=>{
            dispatch({ type: "add", title });
            addNotification(`Added "${title}" to inbox`, "success");
          }} />
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <span>💡</span>
              <span><strong>GTD Tip:</strong> Capture everything that has your attention. Your mind is for having ideas, not holding them.</span>
            </p>
          </div>
        </Section>

        {/* Summary Chart - Add this new section */}
        {tab === "Summary" && (
          <Section title="📊 Productivity Dashboard">
            <SummaryChart items={state.items} />
          </Section>
        )}

        {tab === "Inbox" && (
          <>
            <Section title="Inbox" right={
              inbox.length > 0 && (
                <div className="flex gap-2">
                  <Button kind="ghost" onClick={()=>{
                    inbox.forEach(item=>dispatch({type:"move",id:item.id,status:"someday"}));
                    addNotification(`Moved ${inbox.length} items to Someday`, "info");
                  }}>
                    All → Someday
                  </Button>
                  <Button kind="danger" onClick={async ()=>{
                    const count = inbox.length;
                    const confirmed = await showConfirm({
                      title: "Clear All Inbox Items",
                      message: `Are you sure you want to delete all ${count} items from your Inbox? This action cannot be undone.`,
                      confirmText: "Delete All",
                      cancelText: "Cancel"
                    });
                    
                    if (confirmed) {
                      dispatch({type:"delete",ids:inbox.map(i=>i.id)});
                      addNotification(`Deleted ${count} items from Inbox`, "success");
                    }
                  }}>
                    Clear All
                  </Button>
                </div>
              )
            }>
              <List items={inbox} {...handlers} />
            </Section>
          </>
        )}

        {tab === "Clarify" && (
          <>
            <Section title="Clarify each item (2‑minute rule, delegate, defer)">
              <p className="mb-3 text-sm text-slate-600">Open an item below and decide: Is it actionable? If yes, define the very next physical action and organize it. If no, send to Someday/Maybe or Reference.</p>
              <List items={inbox} {...handlers} />
            </Section>
          </>
        )}

        {tab === "Next" && (
          <>
            <Section title="Filters">
              <Filters query={query} setQuery={setQuery} context={ctxFilter} setContext={setCtxFilter} energy={engFilter} setEnergy={setEngFilter} onlyDue={onlyDue} setOnlyDue={setOnlyDue} />
            </Section>
            {contexts.map(ctx => (
              <Section key={ctx} title={<span>Context <Badge>{ctx}</Badge></span>}>
                <List items={next.filter(i=>i.context===ctx)} {...handlers} />
              </Section>
            ))}
          </>
        )}

        {tab === "Waiting" && (
          <Section title="Waiting For">
            <List items={waiting} {...handlers} />
          </Section>
        )}

        {tab === "Projects" && (
          <Section title="Projects (desired outcomes)" right={
            projects.length > 0 && (
              <Button kind="ghost" onClick={async ()=>{
                const completedProjects = projects.filter(p=>p.done);
                if (completedProjects.length === 0) {
                  addNotification("No completed projects to archive", "info");
                  return;
                }
                
                const confirmed = await showConfirm({
                  title: "Archive Completed Projects",
                  message: `Are you sure you want to archive ${completedProjects.length} completed project${completedProjects.length > 1 ? 's' : ''}? This will permanently delete them.`,
                  confirmText: "Archive",
                  cancelText: "Cancel"
                });
                
                if (confirmed) {
                  completedProjects.forEach(p=>dispatch({type:"delete",ids:[p.id]}));
                  addNotification(`Archived ${completedProjects.length} completed projects`, "success");
                }
              }}>
                Archive Completed
              </Button>
            )
          }>
            <List items={projects} {...handlers} />
          </Section>
        )}

        {tab === "Someday" && (
          <Section title="Someday / Maybe">
            <List items={someday} {...handlers} />
          </Section>
        )}

        {tab === "Reference" && (
          <Section title="Reference (non-actionable info)">
            <List items={reference} {...handlers} />
          </Section>
        )}

        {tab === "Review" && (
          <Section title="Weekly Review">
            <WeeklyReview items={[...items]} onMove={handlers.onMove} />
          </Section>
        )}

        <footer className="pt-8 text-center text-xs text-slate-500">
          Built for GTD: Capture → Clarify → Organize → Reflect → Engage
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ConfirmProvider>
  );
}
