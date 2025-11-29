// module-loader.js
// Located at: /src/core/module-loader.js
//
// - Imports MODULES + getModuleConfig from ./modules-sdk.js (same folder)
// - Dynamically loads modules from /src/modules/<name>/module.js

import { MODULES, getModuleConfig } from './modules-sdk.js';

// Map module keys to actual file paths
// Paths are relative to this file: /src/core/module-loader.js
const MODULE_PATHS = {
  dashboard: '../modules/dashboard/module.js',
  mindmap: '../modules/mindmap/module.js',
  flowchart: '../modules/flowchart/module.js',
  wireframes: '../modules/wireframe/module.js',
  'ui-mockups': '../modules/uimock/module.js',
  business: '../modules/business/module.js',
  'task-board': '../modules/kanban/module.js',
  notes: '../modules/notes/module.js',
  snapshots: '../modules/snapshots/module.js'
};

window.ModuleRegistry = {
  modules: MODULES,
  getModuleConfig,

  async loadModule(container, project, saved, api, moduleKey) {
    const config = getModuleConfig(moduleKey);
    if (!config) {
      container.innerHTML =
        `<div style="padding:1rem;color:var(--mw-text-muted);">Unknown module: ${moduleKey}</div>`;
      return;
    }

    const path = MODULE_PATHS[moduleKey];
    if (!path) {
      container.innerHTML =
        `<div style="padding:1rem;color:var(--mw-text-muted);">Unknown module: ${moduleKey}</div>`;
      return;
    }

    try {
      const mod = await import(path);
      const enhancedApi = {
        ...api,
        linkToModule(targetKey, data) {
          const url = new URL(window.location.href);
          const pid =
            project?.id ||
            project?.projectId ||
            project?._id;
          if (pid) url.searchParams.set('projectId', pid);
          url.searchParams.set('module', targetKey);
          if (data) url.searchParams.set('data', JSON.stringify(data));
          window.location.assign(url.toString());
        }
      };
      await mod.default(container, project, saved, enhancedApi);
    } catch (e) {
      console.error('Module load error:', e);
      container.innerHTML =
        `<div style="padding:1rem;color:var(--mw-text-muted);">Failed to load module "${moduleKey}"</div>`;
    }
  }
};
