// modules-sdk.js
// Located at: /src/core/modules-sdk.js
// --------------------------------------------------------
// EXPORTS:
// - MODULES: list of all workspace modules
// - makeId(): simple unique ID generator
// - formatTimestamp(): display-friendly date format
// - getModuleConfig(): returns module config by key
// --------------------------------------------------------

export const MODULES = [
  { key: 'dashboard',  label: 'Dashboard',  icon: '📊' },
  { key: 'mindmap',    label: 'Mind Map',   icon: '🧠' },
  { key: 'flowchart',  label: 'Flowchart',  icon: '📈' },

  // plural key to match ?module=wireframes
  { key: 'wireframes', label: 'Wireframes', icon: '🖼️' },

  // dash keys to match cards + URL structure
  { key: 'task-board', label: 'Task Board', icon: '📋' },
  { key: 'ui-mockups', label: 'UI Mockups', icon: '🎨' },

  { key: 'business',   label: 'Business',   icon: '💼' },
  { key: 'concept',    label: 'Concept',    icon: '💡' },

  { key: 'notes',      label: 'Notes',      icon: '📝' },
  { key: 'snapshots',  label: 'Snapshots',  icon: '📸' }
];

// --------------------------------------------------------
// Utilities
// --------------------------------------------------------

export function makeId() {
  return `id-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
}

export function getModuleConfig(moduleKey) {
  return MODULES.find(m => m.key === moduleKey) || null;
}
