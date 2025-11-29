// /src/modules/dashboard.js
// Entry file so ?module=dashboard works with your folder structure.

import DashboardModule, {
  meta,
  mount,
  unmount
} from './dashboard/module.js';

// Re-export named pieces (optional, but nice for tooling)
export { meta, mount, unmount };

// This is what your module loader is checking:
export default DashboardModule;
