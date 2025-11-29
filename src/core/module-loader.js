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

function renderError(container, message) {
  container.innerHTML =
    `<div style="padding:1rem;color:var(--mw-text-muted);">${message}</div>`;
}

window.ModuleRegistry = {
  modules: MODULES,
  getModuleConfig,

  async loadModule(container, project, saved, api, moduleKey) {
    const config = getModuleConfig(moduleKey);
    if (!config) {
      renderError(container, `Unknown module: ${moduleKey}`);
      return;
    }

    const path = MODULE_PATHS[moduleKey];
    if (!path) {
      renderError(container, `Unknown module: ${moduleKey}`);
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

      // ------------------------------------------------------------
      // Resolve entry function:
      // 1) default export is a function → use it
      // 2) otherwise, if mod.mount is a function → wrap it
      // 3) otherwise → show "no default export" message
      // ------------------------------------------------------------
      let entry = null;

      if (typeof mod.default === 'function') {
        entry = mod.default;
      } else if (mod && typeof mod.mount === 'function') {
        entry = function wrappedModule(containerArg, projectArg, savedArg, apiArg) {
          const context = { project: projectArg, saved: savedArg, api: apiArg };
          return mod.mount(containerArg, context);
        };
      }

      if (!entry) {
        console.warn('Module loaded but has no callable default export:', moduleKey, mod);
        renderError(container, 'Module loaded but has no default export.');
        return;
      }

      await entry(container, project, saved, enhancedApi);
    } catch (e) {
      console.error('Module load error:', e);
      renderError(container, `Failed to load module "${moduleKey}"`);
    }
  }
};
