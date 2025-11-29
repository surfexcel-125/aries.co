// /src/modules/dashboard/module.js
// Aries Dashboard — Mission control for projects & work

console.log("DASHBOARD MODULE LOADED v3");

import { apply as applyUiKit } from '../shared/ui-kit.js';

export const meta = {
  id: 'dashboard',
  title: 'Dashboard',
  icon: 'gauge',
  description: 'Metrics, focus view, and activity across your workspace.'
};

// ----- State ---------------------------------------------------------------

let rootEl = null;
let containerEl = null;

let kpisEl = null;
let todayEl = null;
let activityEl = null;
let highlightsEl = null;

let viewButtons = [];
let timeframeButtons = [];
let focusToggleEl = null;
let searchInputEl = null;
let activityTabButtons = [];

const state = {
  viewMode: 'my',        // 'my' | 'team' | 'exec'
  timeframe: 'today',    // 'today' | 'week' | 'month'
  focusOnly: false,
  activityTab: 'mine',   // 'mine' | 'workspace'
  search: ''
};

// ----- Sample data (dummy until you plug backend) -------------------------

const KPI_SETS = {
  my: {
    today: [
      { id: 'kpi_my_t_tasks',    label: 'Open tasks',         value: 12,  delta: '+3 today',           tone: 'accent' },
      { id: 'kpi_my_t_blocked',  label: 'Blocked',            value: 2,   delta: 'Needs attention',    tone: 'danger' },
      { id: 'kpi_my_t_focus',    label: 'Focus now',          value: 3,   delta: 'Due in 24h',         tone: 'warning' },
      { id: 'kpi_my_t_projects', label: 'Active projects',    value: 4,   delta: 'You touch 2 today',  tone: 'neutral' }
    ],
    week: [
      { id: 'kpi_my_w_tasks',    label: 'Completed this week', value: 28, delta: '+12 vs last week',   tone: 'accent' },
      { id: 'kpi_my_w_lead',     label: 'Avg cycle time',      value: '2.3d', delta: 'Faster by 0.4d', tone: 'neutral' },
      { id: 'kpi_my_w_blocked',  label: 'Times blocked',       value: 4,  delta: '↓ from 7 last week', tone: 'good' },
      { id: 'kpi_my_w_focus',    label: 'High-priority left',  value: 6,  delta: 'Ship 3 to stay on track', tone: 'warning' }
    ],
    month: [
      { id: 'kpi_my_m_tasks',    label: 'Shipped this month',  value: 63, delta: '+18 vs last month',  tone: 'accent' },
      { id: 'kpi_my_m_sla',      label: 'On-time delivery',    value: '92%', delta: 'Goal 90%',       tone: 'good' },
      { id: 'kpi_my_m_overdue',  label: 'Overdue tasks',       value: 1,  delta: 'At risk',           tone: 'danger' },
      { id: 'kpi_my_m_projects', label: 'Projects touched',    value: 7,  delta: 'Breadth increasing', tone: 'neutral' }
    ]
  },
  team: {
    today: [
      { id: 'kpi_team_t_active',   label: 'Active tasks',     value: 76, delta: 'Across 6 projects',       tone: 'neutral' },
      { id: 'kpi_team_t_inreview', label: 'In review',        value: 9,  delta: 'Ship window today',       tone: 'accent' },
      { id: 'kpi_team_t_blocked',  label: 'Blocked',          value: 5,  delta: 'Across 3 owners',         tone: 'danger' },
      { id: 'kpi_team_t_velocity', label: 'Daily throughput', value: 18, delta: 'Rolling avg',             tone: 'good' }
    ],
    week: [
      { id: 'kpi_team_w_velocity', label: 'Cards completed',  value: 94,  delta: '↑ 12% vs last week',     tone: 'good' },
      { id: 'kpi_team_w_lead',     label: 'Avg lead time',    value: '3.1d', delta: 'Stable',             tone: 'neutral' },
      { id: 'kpi_team_w_spill',    label: 'Spillover',        value: 7,   delta: 'Reduce next cycle',     tone: 'warning' },
      { id: 'kpi_team_w_bugs',     label: 'Bug ratio',        value: '24%', delta: 'Watch this',         tone: 'danger' }
    ],
    month: [
      { id: 'kpi_team_m_shipped',  label: 'Features shipped', value: 21, delta: '3 big launches',         tone: 'accent' },
      { id: 'kpi_team_m_health',   label: 'Project health',   value: '4 / 5', delta: 'Most on track',    tone: 'good' },
      { id: 'kpi_team_m_block',    label: 'Block rate',       value: '11%', delta: 'Goal < 8%',          tone: 'warning' },
      { id: 'kpi_team_m_heads',    label: 'Active collaborators', value: 12, delta: '3 new joiners',    tone: 'neutral' }
    ]
  },
  exec: {
    today: [
      { id: 'kpi_exec_t_projects', label: 'Strategic projects', value: 5,   delta: '3 green / 2 amber', tone: 'accent' },
      { id: 'kpi_exec_t_risks',    label: 'Risks flagged',      value: 3,   delta: 'In discussion',      tone: 'warning' },
      { id: 'kpi_exec_t_blockers', label: 'Critical blockers',  value: 1,   delta: 'Needs decision',    tone: 'danger' },
      { id: 'kpi_exec_t_teams',    label: 'Teams active',       value: 4,   delta: 'Distributed load',  tone: 'good' }
    ],
    week: {
      // keep simple: reuse today
      0: null
    },
    month: {
      0: null
    }
  }
};

const TODAY_ITEMS = [
  { id: 'td_1', bucket: 'now',   type: 'task',    title: 'Review “Onboarding flow” wireframe', module: 'wireframe', project: 'New user journey',      priority: 'high',   due: 'Today',      blocked: false },
  { id: 'td_2', bucket: 'now',   type: 'task',    title: 'Unblock “Payments step” in Kanban',  module: 'kanban',    project: 'Checkout 2.0',        priority: 'high',   due: 'Today',      blocked: true  },
  { id: 'td_3', bucket: 'next',  type: 'meeting', title: 'Standup with design & backend',      module: 'concept',   project: 'Workspace revamp',    priority: 'medium', due: 'In 2h',      blocked: false },
  { id: 'td_4', bucket: 'next',  type: 'task',    title: 'Polish dashboard widget copy',       module: 'notes',     project: 'Aries marketing site',priority: 'medium', due: 'Today',      blocked: false },
  { id: 'td_5', bucket: 'later', type: 'task',    title: 'Draft v2 of “Snapshots” UX',         module: 'snapshots', project: 'Snapshots alpha',     priority: 'low',    due: 'This week',  blocked: false }
];

const ACTIVITY_ITEMS = [
  { id: 'ac_1', tab: 'mine',      kind: 'assign',   title: 'You were assigned “Design auth error states”', module: 'kanban',    project: 'Auth polish',       timeAgo: '12m ago', critical: true  },
  { id: 'ac_2', tab: 'mine',      kind: 'comment',  title: 'New comment on “Pricing page wireframe”',      module: 'wireframe', project: 'Website 2.0',       timeAgo: '29m ago', critical: false },
  { id: 'ac_3', tab: 'mine',      kind: 'due',      title: '“Onboarding insights note” is due today',      module: 'notes',     project: 'Growth experiments',timeAgo: '1h ago',  critical: true  },
  { id: 'ac_4', tab: 'workspace', kind: 'status',   title: '“Checkout 2.0” moved to At risk',              module: 'dashboard', project: 'Checkout 2.0',     timeAgo: '18m ago', critical: true  },
  { id: 'ac_5', tab: 'workspace', kind: 'ship',     title: 'Team shipped “Snapshots capture v1”',          module: 'snapshots', project: 'Snapshots alpha',   timeAgo: '2h ago',  critical: false },
  { id: 'ac_6', tab: 'workspace', kind: 'activity', title: 'Flowchart “Infra rollout” updated by Alex',    module: 'flowchart', project: 'Infra migration',   timeAgo: '3h ago',  critical: false }
];

const HIGHLIGHTS = [
  {
    id: 'hi_1',
    label: 'Urgent Kanban cards',
    module: 'kanban',
    metrics: { count: 5, blocked: 2 },
    description: 'P0 items across 3 projects; 2 currently blocked.',
    emphasis: 'critical'
  },
  {
    id: 'hi_2',
    label: 'Recently edited wireframes',
    module: 'wireframe',
    metrics: { count: 3 },
    description: 'Onboarding, Billing, and Settings boards changed in last 24h.',
    emphasis: 'normal'
  },
  {
    id: 'hi_3',
    label: 'Pinned notes',
    module: 'notes',
    metrics: { count: 4 },
    description: 'Decision logs and insights for this week’s priorities.',
    emphasis: 'quiet'
  },
  {
    id: 'hi_4',
    label: 'Snapshots to review',
    module: 'snapshots',
    metrics: { count: 2 },
    description: 'Latest UX captures awaiting confirmation.',
    emphasis: 'normal'
  }
];

// ----- Helpers -------------------------------------------------------------

function getActiveKpis() {
  const byView = KPI_SETS[state.viewMode] || KPI_SETS.my;
  const arr = byView[state.timeframe] || byView.today || byView['today'] || [];
  return Array.isArray(arr) ? arr : KPI_SETS.my.today;
}

function textMatches(item, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return JSON.stringify(item).toLowerCase().includes(q);
}

function filterTodayItems() {
  return TODAY_ITEMS.filter(item => {
    if (state.focusOnly && !(item.priority === 'high' || item.blocked)) return false;
    return textMatches(item, state.search);
  });
}

function filterActivityItems() {
  return ACTIVITY_ITEMS.filter(item => {
    if (item.tab !== state.activityTab) return false;
    if (state.focusOnly && !item.critical) return false;
    return textMatches(item, state.search);
  });
}

function filterHighlights() {
  return HIGHLIGHTS.filter(item => {
    if (state.focusOnly && item.emphasis !== 'critical') return false;
    return textMatches(item, state.search);
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ----- Rendering -----------------------------------------------------------

function renderKpis() {
  if (!kpisEl) return;

  const kpis = getActiveKpis();
  if (!kpis.length) {
    kpisEl.innerHTML = `
      <section class="mw-db-widget mw-db-widget--empty">
        <p class="mw-db-empty-title">No metrics yet</p>
        <p class="mw-db-empty-text">Connect boards to see live numbers here.</p>
      </section>`;
    return;
  }

  const cards = kpis.map(kpi => {
    const toneClass = `mw-db-kpi-card--${kpi.tone}`;
    return `
      <button type="button" class="mw-db-kpi-card ${toneClass}" data-db-kpi-id="${kpi.id}">
        <div class="mw-db-kpi-label">${kpi.label}</div>
        <div class="mw-db-kpi-value">${kpi.value}</div>
        <div class="mw-db-kpi-delta">${kpi.delta}</div>
      </button>`;
  }).join('');

  kpisEl.innerHTML = `
    <section class="mw-db-widget mw-db-widget--kpis">
      <div class="mw-db-widget-header">
        <div class="mw-db-widget-titles">
          <h2 class="mw-db-widget-title">Workspace health</h2>
          <p class="mw-db-widget-subtitle">
            Key signals for ${state.viewMode === 'my' ? 'your day' : state.viewMode + ' view'}.
          </p>
        </div>
      </div>
      <div class="mw-db-kpi-grid">${cards}</div>
    </section>`;
}

function renderToday() {
  if (!todayEl) return;

  const items = filterTodayItems();
  if (!items.length) {
    todayEl.innerHTML = `
      <section class="mw-db-widget mw-db-widget--list">
        <div class="mw-db-widget-header">
          <div class="mw-db-widget-titles">
            <h2 class="mw-db-widget-title">Today’s plan</h2>
            <p class="mw-db-widget-subtitle">
              Nothing scheduled yet. Turn ideas into tasks from Kanban or Notes.
            </p>
          </div>
        </div>
        <div class="mw-db-empty-state">
          <p class="mw-db-empty-title">All clear for now</p>
          <p class="mw-db-empty-text">Add tasks and they’ll show up here.</p>
        </div>
      </section>`;
    return;
  }

  const buckets = ['now', 'next', 'later'];
  const labels = { now: 'Now', next: 'Next', later: 'Later' };

  const sections = buckets.map(bucket => {
    const bucketItems = items.filter(i => i.bucket === bucket);
    if (!bucketItems.length) return '';

    const rows = bucketItems.map(item => {
      const priorityClass = `mw-db-pill-priority--${item.priority}`;
      const blocked = item.blocked
        ? `<span class="mw-db-pill mw-db-pill--danger">Blocked</span>`
        : '';

      return `
        <article class="mw-db-row">
          <div class="mw-db-row-main">
            <h3 class="mw-db-row-title">${item.title}</h3>
            <p class="mw-db-row-meta">
              <span class="mw-db-row-project">${item.project}</span>
              <span class="mw-db-row-dot">•</span>
              <span class="mw-db-row-module">${item.module}</span>
            </p>
          </div>
          <div class="mw-db-row-tags">
            <span class="mw-db-pill mw-db-pill-priority ${priorityClass}">
              ${item.priority === 'high' ? 'P0' : item.priority === 'medium' ? 'P1' : 'P2'}
            </span>
            ${blocked}
            <span class="mw-db-pill mw-db-pill--soft">${item.due}</span>
          </div>
        </article>`;
    }).join('');

    return `
      <section class="mw-db-list-section">
        <header class="mw-db-list-section-header">
          <span class="mw-db-list-section-label">${labels[bucket]}</span>
          <span class="mw-db-list-section-count">${bucketItems.length}</span>
        </header>
        <div class="mw-db-list-section-body">${rows}</div>
      </section>`;
  }).join('');

  todayEl.innerHTML = `
    <section class="mw-db-widget mw-db-widget--list">
      <div class="mw-db-widget-header">
        <div class="mw-db-widget-titles">
          <h2 class="mw-db-widget-title">Today’s plan</h2>
          <p class="mw-db-widget-subtitle">
            Bring tasks from Kanban, Notes, and Wireframes into one lane.
          </p>
        </div>
      </div>
      <div class="mw-db-list">${sections}</div>
    </section>`;
}

function renderActivity() {
  if (!activityEl) return;

  const items = filterActivityItems();
  const tabs = `
    <div class="mw-db-tabs">
      <button type="button" class="mw-db-tab ${state.activityTab === 'mine' ? 'is-active' : ''}" data-db-activity-tab="mine">
        Assigned to me
      </button>
      <button type="button" class="mw-db-tab ${state.activityTab === 'workspace' ? 'is-active' : ''}" data-db-activity-tab="workspace">
        Workspace updates
      </button>
    </div>`;

  let body;
  if (!items.length) {
    body = `
      <div class="mw-db-empty-state">
        <p class="mw-db-empty-title">Nothing here yet</p>
        <p class="mw-db-empty-text">
          When work moves, comments arrive, or due dates approach, they’ll appear here.
        </p>
      </div>`;
  } else {
    const rows = items.map(item => {
      const kindLabel = ({
        assign: 'Assigned',
        comment: 'Comment',
        due: 'Due',
        status: 'Status',
        ship: 'Shipped',
        activity: 'Activity'
      })[item.kind] || 'Update';

      const chipClass = ({
        assign: 'mw-db-pill--accent',
        comment: 'mw-db-pill--soft',
        due: 'mw-db-pill--warning',
        status: 'mw-db-pill--warning',
        ship: 'mw-db-pill--good',
        activity: 'mw-db-pill--soft'
      })[item.kind] || 'mw-db-pill--soft';

      const criticalDot = item.critical
        ? `<span class="mw-db-activity-critical-dot"></span>`
        : '';

      return `
        <article class="mw-db-activity-row">
          <div class="mw-db-activity-main">
            <div class="mw-db-activity-title">
              ${criticalDot}
              <h3>${item.title}</h3>
            </div>
            <p class="mw-db-activity-meta">
              <span class="mw-db-activity-project">${item.project}</span>
              <span class="mw-db-row-dot">•</span>
              <span class="mw-db-activity-module">${item.module}</span>
            </p>
          </div>
          <div class="mw-db-activity-right">
            <span class="mw-db-pill ${chipClass}">${kindLabel}</span>
            <span class="mw-db-activity-time">${item.timeAgo}</span>
          </div>
        </article>`;
    }).join('');

    body = `<div class="mw-db-activity-list">${rows}</div>`;
  }

  activityEl.innerHTML = `
    <section class="mw-db-widget mw-db-widget--activity">
      <div class="mw-db-widget-header">
        <div class="mw-db-widget-titles">
          <h2 class="mw-db-widget-title">Activity</h2>
          <p class="mw-db-widget-subtitle">
            Follow assignments, comments, and status changes across the workspace.
          </p>
        </div>
        ${tabs}
      </div>
      ${body}
    </section>`;

  activityTabButtons = Array.from(activityEl.querySelectorAll('[data-db-activity-tab]'));
  activityTabButtons.forEach(btn =>
    btn.addEventListener('click', handleActivityTabClick)
  );
}

function renderHighlights() {
  if (!highlightsEl) return;

  const items = filterHighlights();
  if (!items.length) {
    highlightsEl.innerHTML = `
      <section class="mw-db-widget mw-db-widget--highlights">
        <div class="mw-db-widget-header">
          <div class="mw-db-widget-titles">
            <h2 class="mw-db-widget-title">Cross-module highlights</h2>
            <p class="mw-db-widget-subtitle">
              As your workspace grows, important slices will show here.
            </p>
          </div>
        </div>
        <div class="mw-db-empty-state">
          <p class="mw-db-empty-title">No highlights yet</p>
          <p class="mw-db-empty-text">Ship some work and we’ll summarize it.</p>
        </div>
      </section>`;
    return;
  }

  const cards = items.map(item => {
    const emphasisClass =
      item.emphasis === 'critical'
        ? 'mw-db-highlight--critical'
        : item.emphasis === 'quiet'
        ? 'mw-db-highlight--quiet'
        : '';

    return `
      <article class="mw-db-highlight ${emphasisClass}">
        <header class="mw-db-highlight-header">
          <div class="mw-db-highlight-labels">
            <span class="mw-db-pill mw-db-pill--soft">${capitalize(item.module)}</span>
            <h3 class="mw-db-highlight-title">${item.label}</h3>
          </div>
        </header>
        <p class="mw-db-highlight-body">${item.description}</p>
        <footer class="mw-db-highlight-footer">
          ${item.metrics.count != null
            ? `<span class="mw-db-highlight-metric">${item.metrics.count} items</span>`
            : ''}
          ${item.metrics.blocked != null
            ? `<span class="mw-db-highlight-metric">${item.metrics.blocked} blocked</span>`
            : ''}
        </footer>
      </article>`;
  }).join('');

  highlightsEl.innerHTML = `
    <section class="mw-db-widget mw-db-widget--highlights">
      <div class="mw-db-widget-header">
        <div class="mw-db-widget-titles">
          <h2 class="mw-db-widget-title">Cross-module highlights</h2>
          <p class="mw-db-widget-subtitle">
            Snapshots from boards, flows, and notes that need your attention.
          </p>
        </div>
      </div>
      <div class="mw-db-highlights-grid">${cards}</div>
    </section>`;
}

function renderAll() {
  renderKpis();
  renderToday();
  renderActivity();
  renderHighlights();
  syncControls();
}

// ----- Controls & events ---------------------------------------------------

function syncControls() {
  viewButtons.forEach(btn => {
    const view = btn.getAttribute('data-db-view');
    const active = view === state.viewMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  timeframeButtons.forEach(btn => {
    const tf = btn.getAttribute('data-db-timeframe');
    const active = tf === state.timeframe;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (focusToggleEl) {
    focusToggleEl.classList.toggle('is-active', state.focusOnly);
    focusToggleEl.setAttribute('aria-pressed', state.focusOnly ? 'true' : 'false');
  }

  if (searchInputEl && searchInputEl.value !== state.search) {
    searchInputEl.value = state.search;
  }
}

function handleViewClick(event) {
  const btn = event.currentTarget;
  const view = btn.getAttribute('data-db-view');
  if (!view || view === state.viewMode) return;
  state.viewMode = view;
  renderAll();
}

function handleTimeframeClick(event) {
  const btn = event.currentTarget;
  const tf = btn.getAttribute('data-db-timeframe');
  if (!tf || tf === state.timeframe) return;
  state.timeframe = tf;
  renderAll();
}

function handleFocusToggle() {
  state.focusOnly = !state.focusOnly;
  renderAll();
}

function handleSearchInput(event) {
  state.search = event.target.value.trim();
  renderToday();
  renderActivity();
  renderHighlights();
}

function handleActivityTabClick(event) {
  const btn = event.currentTarget;
  const tab = btn.getAttribute('data-db-activity-tab');
  if (!tab || tab === state.activityTab) return;
  state.activityTab = tab;
  renderActivity();
}

function handleKeyDown(event) {
  // Ctrl/Cmd + K → focus search
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (searchInputEl) searchInputEl.focus();
    return;
  }

  // Alt + F → focus mode toggle
  if (event.altKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    handleFocusToggle();
  }
}

// ----- Mount / Unmount -----------------------------------------------------

export function mount(container, context = {}) {
  applyUiKit(container);

  container.classList.add('mw-dashboard-host');
  container.tabIndex = 0;

  container.innerHTML = `
    <div class="mw-dashboard">
      <header class="mw-db-header">
        <div class="mw-db-header-left">
          <span class="mw-db-header-pill">Dashboard</span>
          <div class="mw-db-header-titles">
            <h1 class="mw-db-header-title">Mission control</h1>
            <p class="mw-db-header-subtitle">
              See what matters right now across projects, boards, and ideas.
            </p>
          </div>
        </div>
        <div class="mw-db-header-right">
          <div class="mw-db-toggle-group" role="tablist">
            <button type="button" class="mw-db-toggle is-active" data-db-view="my" aria-pressed="true">
              My dashboard
            </button>
            <button type="button" class="mw-db-toggle" data-db-view="team" aria-pressed="false">
              Team
            </button>
            <button type="button" class="mw-db-toggle" data-db-view="exec" aria-pressed="false">
              Overview
            </button>
          </div>
        </div>
      </header>

      <section class="mw-db-controls">
        <div class="mw-db-controls-left">
          <div class="mw-db-chip-group">
            <button type="button" class="mw-db-chip is-active" data-db-timeframe="today" aria-pressed="true">
              Today
            </button>
            <button type="button" class="mw-db-chip" data-db-timeframe="week" aria-pressed="false">
              This week
            </button>
            <button type="button" class="mw-db-chip" data-db-timeframe="month" aria-pressed="false">
              This month
            </button>
          </div>
          <button type="button" class="mw-db-focus-toggle" data-db-focus-toggle aria-pressed="false">
            <span class="mw-db-focus-dot"></span>
            Focus mode
          </button>
        </div>
        <div class="mw-db-controls-right">
          <div class="mw-db-search">
            <span class="mw-db-search-icon">⌕</span>
            <input
              type="search"
              class="mw-db-search-input"
              placeholder="Search tasks, projects, and updates"
              data-db-search
            />
          </div>
        </div>
      </section>

      <main class="mw-db-grid">
        <div class="mw-db-grid-main">
          <div data-db-widget="kpis"></div>
          <div data-db-widget="today"></div>
        </div>
        <aside class="mw-db-grid-side">
          <div data-db-widget="activity"></div>
          <div data-db-widget="highlights"></div>
        </aside>
      </main>
    </div>
  `;

  rootEl       = container.querySelector('.mw-dashboard');
  containerEl  = container;
  kpisEl       = container.querySelector('[data-db-widget="kpis"]');
  todayEl      = container.querySelector('[data-db-widget="today"]');
  activityEl   = container.querySelector('[data-db-widget="activity"]');
  highlightsEl = container.querySelector('[data-db-widget="highlights"]');

  viewButtons      = Array.from(container.querySelectorAll('[data-db-view]'));
  timeframeButtons = Array.from(container.querySelectorAll('[data-db-timeframe]'));
  focusToggleEl    = container.querySelector('[data-db-focus-toggle]');
  searchInputEl    = container.querySelector('[data-db-search]');

  viewButtons.forEach(btn => btn.addEventListener('click', handleViewClick));
  timeframeButtons.forEach(btn => btn.addEventListener('click', handleTimeframeClick));
  if (focusToggleEl) focusToggleEl.addEventListener('click', handleFocusToggle);
  if (searchInputEl) searchInputEl.addEventListener('input', handleSearchInput);
  container.addEventListener('keydown', handleKeyDown);

  renderAll();
  container.focus();
}

export function unmount(container) {
  if (container) {
    container.removeEventListener('keydown', handleKeyDown);
    container.innerHTML = '';
    container.classList.remove('mw-dashboard-host');
  }

  rootEl = null;
  containerEl = null;
  kpisEl = null;
  todayEl = null;
  activityEl = null;
  highlightsEl = null;

  viewButtons = [];
  timeframeButtons = [];
  focusToggleEl = null;
  searchInputEl = null;
  activityTabButtons = [];

  // reset state
  state.viewMode   = 'my';
  state.timeframe  = 'today';
  state.focusOnly  = false;
  state.activityTab= 'mine';
  state.search     = '';
}

// VERY IMPORTANT for your loader: default export object
const DashboardModule = { meta, mount, unmount };
export default DashboardModule;
