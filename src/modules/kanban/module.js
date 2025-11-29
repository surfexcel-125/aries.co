// /src/modules/kanban/module.js
// Aries Kanban Module — v1
// Features:
// - Columns & cards with drag & drop
// - Quick add card per column
// - Search + filters (assignee, priority, "My tasks")
// - Right-side detail panel with editable fields
// - Inline title editing
// - LocalStorage persistence
// - Keyboard helpers (N = new card, Esc = close detail)

console.log("KANBAN MODULE LOADED v1");

import { apply as applyUiKit } from "../shared/ui-kit.js";

const STORAGE_KEY = "aries.kanban.board.v1";

let rootEl = null;
let state = null;
let currentCardId = null;
let currentDrag = null;
let keyboardBound = false;
let currentContainer = null;

// -------------------- Data Model --------------------

function createDefaultBoard(context = {}) {
  const user = context.currentUser || { id: "me", name: "You" };

  const cards = {
    "card-1": {
      id: "card-1",
      title: "Set up Aries workspace",
      description: "Create workspace layout, navigation, and theming.",
      assigneeId: user.id,
      assigneeName: user.name,
      status: "todo",
      priority: "high",
      tags: ["setup", "core"],
      dueDate: null,
      checklist: [
        { id: "c1", label: "Scaffold pages", done: true },
        { id: "c2", label: "Hook modules", done: false }
      ],
      attachments: 0,
      comments: 3,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    "card-2": {
      id: "card-2",
      title: "Design kanban column layout",
      description: "Define sizing, spacing, and interaction flows.",
      assigneeId: user.id,
      assigneeName: user.name,
      status: "inprogress",
      priority: "medium",
      tags: ["design", "kanban"],
      dueDate: null,
      checklist: [],
      attachments: 2,
      comments: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    "card-3": {
      id: "card-3",
      title: "Polish micro-interactions",
      description: "Drag animations, hover states, and detail panel transitions.",
      assigneeId: null,
      assigneeName: null,
      status: "review",
      priority: "low",
      tags: ["ux"],
      dueDate: null,
      checklist: [],
      attachments: 0,
      comments: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  };

  const columns = [
    { id: "backlog", name: "Backlog", wipLimit: 0 },
    { id: "todo", name: "To Do", wipLimit: 6 },
    { id: "inprogress", name: "In Progress", wipLimit: 4 },
    { id: "review", name: "Review", wipLimit: 3 },
    { id: "done", name: "Done", wipLimit: 0 }
  ];

  const columnOrder = columns.map(c => c.id);

  const columnCards = {
    backlog: [],
    todo: ["card-1"],
    inprogress: ["card-2"],
    review: ["card-3"],
    done: []
  };

  return {
    id: "default-board",
    currentUser: user,
    columns,
    columnOrder,
    columnCards,
    cards,
    filters: {
      search: "",
      assignee: "any",
      priority: "any",
      myTasksOnly: false
    },
    view: {
      density: "comfortable" // or "compact"
    }
  };
}

// -------------------- Persistence --------------------

function loadBoard() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // basic sanity check
    if (!parsed.columns || !parsed.cards || !parsed.columnCards) return null;
    return parsed;
  } catch (e) {
    console.warn("Failed to load Kanban board from storage", e);
    return null;
  }
}

function saveBoard() {
  if (!state) return;
  try {
    const data = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.warn("Failed to save Kanban board", e);
  }
}

// -------------------- Mount / Unmount --------------------

export function mount(container, context = {}) {
  currentContainer = container;
  applyUiKit(container);

  rootEl = document.createElement("div");
  rootEl.className = "mw-kanban";
  container.innerHTML = "";
  container.appendChild(rootEl);

  state = loadBoard() || createDefaultBoard(context);
  currentCardId = null;
  currentDrag = null;

  if (!keyboardBound) {
    bindKeyboard();
    keyboardBound = true;
  }

  render();
}

export function unmount() {
  if (currentContainer) {
    currentContainer.innerHTML = "";
  }
  rootEl = null;
  state = null;
  currentCardId = null;
  currentDrag = null;
  // we leave keyboard handlers because the workspace may remount later
}

// -------------------- Keyboard --------------------

function bindKeyboard() {
  document.addEventListener("keydown", e => {
    if (!state || !rootEl) return;

    // Ignore if typing in an input/textarea/select
    const tag = (e.target && e.target.tagName) || "";
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

    if (e.key === "Escape") {
      if (currentCardId) {
        currentCardId = null;
        render();
      }
    }

    if (e.key.toLowerCase() === "n") {
      // Add new card to first non-empty column, or first column
      const targetColumnId = state.columnOrder[0];
      if (targetColumnId) {
        const colEl = rootEl.querySelector(
          `[data-column-id="${CSS.escape(targetColumnId)}"] .mw-kanban-column-footer button`
        );
        if (colEl) {
          colEl.click();
        }
      }
    }
  });
}

// -------------------- Rendering --------------------

function render() {
  if (!rootEl || !state) return;

  const { filters, view } = state;

  const html = `
    <div class="mw-kanban-shell">
      ${renderToolbar(filters, view)}
      <div class="mw-kanban-main">
        <div class="mw-kanban-board" data-density="${view.density}">
          ${renderColumns()}
        </div>
        ${renderDetailPanel()}
      </div>
    </div>
  `;

  rootEl.innerHTML = html;

  bindEvents();
}

function renderToolbar(filters, view) {
  return `
    <div class="mw-kanban-toolbar">
      <div class="mw-kanban-toolbar-left">
        <div class="mw-kanban-title">Kanban</div>
        <div class="mw-kanban-subtitle">Visual workflow for your Aries workspace</div>
      </div>
      <div class="mw-kanban-toolbar-right">
        <div class="mw-kanban-field-group">
          <input
            type="search"
            class="mw-kanban-input"
            placeholder="Search cards…"
            value="${escapeHtml(filters.search)}"
            data-action="filter-search"
          />
        </div>
        <div class="mw-kanban-field-group">
          <select class="mw-kanban-select" data-action="filter-assignee">
            <option value="any"${filters.assignee === "any" ? " selected" : ""}>All assignees</option>
            <option value="me"${filters.assignee === "me" ? " selected" : ""}>Assigned to me</option>
            <option value="unassigned"${filters.assignee === "unassigned" ? " selected" : ""}>Unassigned</option>
          </select>
        </div>
        <div class="mw-kanban-field-group">
          <select class="mw-kanban-select" data-action="filter-priority">
            <option value="any"${filters.priority === "any" ? " selected" : ""}>All priorities</option>
            <option value="low"${filters.priority === "low" ? " selected" : ""}>Low</option>
            <option value="medium"${filters.priority === "medium" ? " selected" : ""}>Medium</option>
            <option value="high"${filters.priority === "high" ? " selected" : ""}>High</option>
            <option value="critical"${filters.priority === "critical" ? " selected" : ""}>Critical</option>
          </select>
        </div>
        <label class="mw-kanban-toggle">
          <input
            type="checkbox"
            data-action="filter-my"
            ${filters.myTasksOnly ? "checked" : ""}
          />
          <span>My tasks</span>
        </label>
        <button class="mw-kanban-density-btn" data-action="toggle-density">
          ${view.density === "comfortable" ? "Compact view" : "Comfortable view"}
        </button>
      </div>
    </div>
  `;
}

function renderColumns() {
  const { columns, columnOrder, columnCards } = state;

  const columnsById = {};
  columns.forEach(c => (columnsById[c.id] = c));

  return columnOrder
    .map(columnId => {
      const col = columnsById[columnId];
      if (!col) return "";
      const cardsHtml = (columnCards[columnId] || [])
        .map(cardId => {
          const card = state.cards[cardId];
          if (!card) return "";
          if (!cardPassesFilters(card)) return "";
          return renderCard(card);
        })
        .join("");

      const count = (columnCards[columnId] || []).filter(id => {
        const card = state.cards[id];
        return card && cardPassesFilters(card);
      }).length;

      const wipExceeded =
        col.wipLimit && col.wipLimit > 0 && count > col.wipLimit;

      return `
        <section class="mw-kanban-column-wrapper" data-column-id="${escapeAttr(
          col.id
        )}">
          <header class="mw-kanban-column-header${
            wipExceeded ? " is-wip-exceeded" : ""
          }">
            <div class="mw-kanban-column-title">
              <span class="mw-kanban-column-name">${escapeHtml(col.name)}</span>
              <span class="mw-kanban-column-count">${count}</span>
            </div>
            ${
              col.wipLimit && col.wipLimit > 0
                ? `<div class="mw-kanban-column-wip">WIP ${count}/${col.wipLimit}</div>`
                : ""
            }
          </header>
          <div class="mw-kanban-column" data-column-droppable="true">
            ${cardsHtml || `<div class="mw-kanban-column-empty">No cards</div>`}
          </div>
          <footer class="mw-kanban-column-footer">
            <button type="button" data-action="add-card" class="mw-kanban-add-card-btn">
              + Add card
            </button>
          </footer>
        </section>
      `;
    })
    .join("");
}

function renderCard(card) {
  const isSelected = currentCardId === card.id;
  const overdue =
    card.dueDate && new Date(card.dueDate).getTime() < Date.now();

  const checklistTotal = card.checklist ? card.checklist.length : 0;
  const checklistDone = card.checklist
    ? card.checklist.filter(c => c.done).length
    : 0;

  const checklistBadge =
    checklistTotal > 0
      ? `<span class="mw-kanban-meta-badge">${checklistDone}/${checklistTotal}</span>`
      : "";

  const attachmentsBadge =
    card.attachments && card.attachments > 0
      ? `<span class="mw-kanban-meta-icon" title="Attachments">${card.attachments}📎</span>`
      : "";

  const commentsBadge =
    card.comments && card.comments > 0
      ? `<span class="mw-kanban-meta-icon" title="Comments">${card.comments}💬</span>`
      : "";

  const tags =
    card.tags && card.tags.length
      ? `<div class="mw-kanban-tags">
          ${card.tags
            .slice(0, 3)
            .map(
              t => `<span class="mw-kanban-tag">${escapeHtml(String(t))}</span>`
            )
            .join("")}
          ${
            card.tags.length > 3
              ? `<span class="mw-kanban-tag mw-kanban-tag-more">+${card.tags.length -
                  3}</span>`
              : ""
          }
        </div>`
      : "";

  const assignee =
    card.assigneeName || card.assigneeId
      ? `<div class="mw-kanban-avatar" title="${escapeAttr(
          card.assigneeName || card.assigneeId
        )}">
          ${escapeHtml(
            (card.assigneeName || card.assigneeId || "?")
              .toString()
              .trim()
              .charAt(0)
              .toUpperCase()
          )}
        </div>`
      : `<div class="mw-kanban-avatar mw-kanban-avatar-empty" title="Unassigned">?</div>`;

  return `
    <article
      class="mw-kanban-card mw-kanban-priority-${escapeAttr(
        card.priority || "low"
      )}${isSelected ? " is-selected" : ""}${
    overdue ? " is-overdue" : ""
  }"
      draggable="true"
      data-card-id="${escapeAttr(card.id)}"
    >
      <div class="mw-kanban-card-main" data-action="open-card">
        <div
          class="mw-kanban-card-title"
          data-action="edit-title"
          title="Double-click to rename"
        >
          ${escapeHtml(card.title || "(Untitled)")}
        </div>
        ${card.description ? `<p class="mw-kanban-card-desc">
          ${escapeHtml(card.description.slice(0, 120))}
          ${card.description.length > 120 ? "…" : ""}
        </p>` : ""}
        ${tags}
      </div>
      <div class="mw-kanban-card-footer">
        <div class="mw-kanban-card-footer-left">
          ${assignee}
          ${
            card.dueDate
              ? `<span class="mw-kanban-due ${
                  overdue ? "is-overdue" : ""
                }">${escapeHtml(
                  new Date(card.dueDate).toLocaleDateString()
                )}</span>`
              : ""
          }
        </div>
        <div class="mw-kanban-card-footer-right">
          <span class="mw-kanban-meta-badge mw-kanban-priority-label">
            ${priorityLabel(card.priority)}
          </span>
          ${checklistBadge}
          ${attachmentsBadge}
          ${commentsBadge}
        </div>
      </div>
    </article>
  `;
}

function renderDetailPanel() {
  if (!currentCardId) {
    return `<aside class="mw-kanban-detail mw-kanban-detail-empty">
      <div class="mw-kanban-detail-placeholder">
        <div class="mw-kanban-detail-placeholder-title">Select a card</div>
        <div class="mw-kanban-detail-placeholder-text">
          Click a card to see full details, edit fields, and manage checklist.
        </div>
      </div>
    </aside>`;
  }

  const card = state.cards[currentCardId];
  if (!card) return "";

  const checklistHtml =
    card.checklist && card.checklist.length
      ? card.checklist
          .map(
            item => `
          <label class="mw-kanban-checklist-item">
            <input
              type="checkbox"
              data-action="toggle-checklist"
              data-check-id="${escapeAttr(item.id)}"
              ${item.done ? "checked" : ""}
            />
            <span>${escapeHtml(item.label)}</span>
          </label>
        `
          )
          .join("")
      : `<div class="mw-kanban-empty-hint">No checklist items yet.</div>`;

  return `
    <aside class="mw-kanban-detail">
      <header class="mw-kanban-detail-header">
        <input
          class="mw-kanban-detail-title-input"
          value="${escapeAttr(card.title || "")}"
          data-action="detail-title"
        />
        <button
          type="button"
          class="mw-kanban-detail-close"
          data-action="close-detail"
        >✕</button>
      </header>

      <section class="mw-kanban-detail-section">
        <label class="mw-kanban-field">
          <div class="mw-kanban-field-label">Description</div>
          <textarea
            class="mw-kanban-textarea"
            rows="5"
            data-action="detail-description"
          >${escapeHtml(card.description || "")}</textarea>
        </label>
      </section>

      <section class="mw-kanban-detail-section mw-kanban-detail-grid">
        <label class="mw-kanban-field">
          <div class="mw-kanban-field-label">Assignee</div>
          <input
            class="mw-kanban-input"
            placeholder="Name or ID"
            value="${escapeAttr(card.assigneeName || card.assigneeId || "")}"
            data-action="detail-assignee"
          />
        </label>

        <label class="mw-kanban-field">
          <div class="mw-kanban-field-label">Priority</div>
          <select class="mw-kanban-select" data-action="detail-priority">
            <option value="low"${card.priority === "low" ? " selected" : ""}>Low</option>
            <option value="medium"${
              card.priority === "medium" ? " selected" : ""
            }>Medium</option>
            <option value="high"${
              card.priority === "high" ? " selected" : ""
            }>High</option>
            <option value="critical"${
              card.priority === "critical" ? " selected" : ""
            }>Critical</option>
          </select>
        </label>

        <label class="mw-kanban-field">
          <div class="mw-kanban-field-label">Status</div>
          <select class="mw-kanban-select" data-action="detail-status">
            ${state.columns
              .map(
                col => `
              <option value="${escapeAttr(col.id)}"${
                  card.status === col.id ? " selected" : ""
                }>
                ${escapeHtml(col.name)}
              </option>
            `
              )
              .join("")}
          </select>
        </label>

        <label class="mw-kanban-field">
          <div class="mw-kanban-field-label">Due date</div>
          <input
            type="date"
            class="mw-kanban-input"
            value="${card.dueDate ? formatDateInput(card.dueDate) : ""}"
            data-action="detail-due"
          />
        </label>
      </section>

      <section class="mw-kanban-detail-section">
        <div class="mw-kanban-section-header">
          <div class="mw-kanban-field-label">Checklist</div>
          <button
            type="button"
            class="mw-kanban-text-btn"
            data-action="add-checklist-item"
          >+ Add item</button>
        </div>
        <div class="mw-kanban-checklist">
          ${checklistHtml}
        </div>
      </section>

      <section class="mw-kanban-detail-section">
        <div class="mw-kanban-section-header">
          <div class="mw-kanban-field-label">Tags</div>
        </div>
        <input
          class="mw-kanban-input"
          placeholder="Comma separated tags (e.g. bug,frontend)"
          value="${escapeAttr((card.tags || []).join(", "))}"
          data-action="detail-tags"
        />
      </section>
    </aside>
  `;
}

// -------------------- Filtering Helpers --------------------

function cardPassesFilters(card) {
  const { filters, currentUser } = state;
  const search = filters.search.trim().toLowerCase();

  if (search) {
    const haystack =
      (card.title || "") +
      " " +
      (card.description || "") +
      " " +
      (card.tags || []).join(" ");
    if (!haystack.toLowerCase().includes(search)) return false;
  }

  if (filters.assignee === "me") {
    if (!currentUser || !card.assigneeId) return false;
    if (card.assigneeId !== currentUser.id) return false;
  }

  if (filters.assignee === "unassigned") {
    if (card.assigneeId) return false;
  }

  if (filters.priority !== "any") {
    if (card.priority !== filters.priority) return false;
  }

  if (filters.myTasksOnly) {
    if (!currentUser || card.assigneeId !== currentUser.id) return false;
  }

  return true;
}

// -------------------- Events --------------------

function bindEvents() {
  if (!rootEl) return;

  // Toolbar events
  const searchInput = rootEl.querySelector('[data-action="filter-search"]');
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      state.filters.search = e.target.value;
      saveBoard();
      render();
    });
  }

  const assigneeSelect = rootEl.querySelector('[data-action="filter-assignee"]');
  if (assigneeSelect) {
    assigneeSelect.addEventListener("change", e => {
      state.filters.assignee = e.target.value;
      saveBoard();
      render();
    });
  }

  const prioritySelect = rootEl.querySelector('[data-action="filter-priority"]');
  if (prioritySelect) {
    prioritySelect.addEventListener("change", e => {
      state.filters.priority = e.target.value;
      saveBoard();
      render();
    });
  }

  const myToggle = rootEl.querySelector('[data-action="filter-my"]');
  if (myToggle) {
    myToggle.addEventListener("change", e => {
      state.filters.myTasksOnly = !!e.target.checked;
      saveBoard();
      render();
    });
  }

  const densityBtn = rootEl.querySelector('[data-action="toggle-density"]');
  if (densityBtn) {
    densityBtn.addEventListener("click", () => {
      state.view.density =
        state.view.density === "comfortable" ? "compact" : "comfortable";
      saveBoard();
      render();
    });
  }

  // Column + card events (delegated)
  rootEl.addEventListener("click", onRootClick);
  rootEl.addEventListener("dblclick", onRootDblClick);

  // Detail inputs (delegated)
  rootEl.addEventListener("input", onRootInput);
  rootEl.addEventListener("change", onRootChange);

  // Drag & drop
  const cards = rootEl.querySelectorAll(".mw-kanban-card[draggable]");
  cards.forEach(cardEl => {
    cardEl.addEventListener("dragstart", onCardDragStart);
    cardEl.addEventListener("dragend", onCardDragEnd);
  });

  const droppables = rootEl.querySelectorAll(
    ".mw-kanban-column[data-column-droppable]"
  );
  droppables.forEach(colEl => {
    colEl.addEventListener("dragover", onColumnDragOver);
    colEl.addEventListener("drop", onColumnDrop);
    colEl.addEventListener("dragleave", onColumnDragLeave);
  });
}

function onRootClick(e) {
  const target = e.target;

  // Add card
  if (target.matches('[data-action="add-card"]')) {
    const section = target.closest(".mw-kanban-column-wrapper");
    if (!section) return;
    const columnId = section.getAttribute("data-column-id");
    addCardInline(section, columnId);
    return;
  }

  // Open card detail
  const cardMain = target.closest('[data-action="open-card"]');
  if (cardMain) {
    const cardEl = cardMain.closest(".mw-kanban-card");
    if (!cardEl) return;
    const cardId = cardEl.getAttribute("data-card-id");
    currentCardId = cardId;
    render();
    return;
  }

  // Close detail
  if (target.matches('[data-action="close-detail"]')) {
    currentCardId = null;
    render();
    return;
  }

  // Add checklist item
  if (target.matches('[data-action="add-checklist-item"]')) {
    if (!currentCardId) return;
    const card = state.cards[currentCardId];
    if (!card.checklist) card.checklist = [];
    const id = "chk-" + Date.now();
    card.checklist.push({ id, label: "New item", done: false });
    card.updatedAt = Date.now();
    saveBoard();
    render();
    return;
  }
}

function onRootDblClick(e) {
  const target = e.target;

  // Inline title edit from card
  const titleEl = target.closest('[data-action="edit-title"]');
  if (titleEl) {
    const cardEl = titleEl.closest(".mw-kanban-card");
    if (!cardEl) return;
    const cardId = cardEl.getAttribute("data-card-id");
    startInlineTitleEdit(cardEl, cardId);
  }
}

function onRootInput(e) {
  const target = e.target;

  if (!currentCardId) return;
  const card = state.cards[currentCardId];
  if (!card) return;

  switch (target.getAttribute("data-action")) {
    case "detail-title":
      card.title = target.value;
      card.updatedAt = Date.now();
      saveBoard();
      // Also re-render cards (title appears there)
      render();
      break;
    case "detail-description":
      card.description = target.value;
      card.updatedAt = Date.now();
      saveBoard();
      break;
    case "detail-assignee":
      const value = target.value.trim();
      card.assigneeName = value || null;
      card.assigneeId = value || null;
      card.updatedAt = Date.now();
      saveBoard();
      render();
      break;
    case "detail-tags":
      card.tags = target.value
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      card.updatedAt = Date.now();
      saveBoard();
      render();
      break;
    default:
      break;
  }
}

function onRootChange(e) {
  const target = e.target;

  if (target.getAttribute("data-action") === "detail-priority") {
    const card = state.cards[currentCardId];
    if (!card) return;
    card.priority = target.value;
    card.updatedAt = Date.now();
    saveBoard();
    render();
    return;
  }

  if (target.getAttribute("data-action") === "detail-status") {
    const card = state.cards[currentCardId];
    if (!card) return;
    moveCardToColumn(card.id, target.value);
    card.status = target.value;
    card.updatedAt = Date.now();
    saveBoard();
    render();
    return;
  }

  if (target.getAttribute("data-action") === "detail-due") {
    const card = state.cards[currentCardId];
    if (!card) return;
    card.dueDate = target.value ? new Date(target.value).toISOString() : null;
    card.updatedAt = Date.now();
    saveBoard();
    render();
    return;
  }

  if (target.getAttribute("data-action") === "toggle-checklist") {
    const checkId = target.getAttribute("data-check-id");
    const card = state.cards[currentCardId];
    if (!card || !card.checklist) return;
    const item = card.checklist.find(c => c.id === checkId);
    if (!item) return;
    item.done = !!target.checked;
    card.updatedAt = Date.now();
    saveBoard();
    render();
    return;
  }
}

// -------------------- Inline Title Edit --------------------

function startInlineTitleEdit(cardEl, cardId) {
  const card = state.cards[cardId];
  if (!card) return;

  const titleEl = cardEl.querySelector(".mw-kanban-card-title");
  if (!titleEl) return;

  const current = card.title || "";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "mw-kanban-inline-title-input";
  input.value = current;
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      finishInlineTitleEdit(cardId, input, true);
    } else if (e.key === "Escape") {
      finishInlineTitleEdit(cardId, input, false);
    }
  });
  input.addEventListener("blur", () => {
    finishInlineTitleEdit(cardId, input, true);
  });

  titleEl.innerHTML = "";
  titleEl.appendChild(input);
  input.focus();
  input.select();
}

function finishInlineTitleEdit(cardId, input, save) {
  const card = state.cards[cardId];
  if (!card) return;

  if (save) {
    const value = input.value.trim();
    if (value) {
      card.title = value;
      card.updatedAt = Date.now();
      saveBoard();
    }
  }

  render();
}

// -------------------- Drag & Drop --------------------

function onCardDragStart(e) {
  const cardEl = e.currentTarget;
  const cardId = cardEl.getAttribute("data-card-id");
  if (!cardId) return;

  currentDrag = {
    cardId,
    sourceColumnId: findColumnIdForCard(cardId)
  };

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", cardId);

  cardEl.classList.add("is-dragging");
}

function onCardDragEnd(e) {
  const cardEl = e.currentTarget;
  cardEl.classList.remove("is-dragging");
  currentDrag = null;

  const cols = rootEl.querySelectorAll(".mw-kanban-column.is-drop-target");
  cols.forEach(c => c.classList.remove("is-drop-target"));
}

function onColumnDragOver(e) {
  if (!currentDrag) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  const colEl = e.currentTarget;
  colEl.classList.add("is-drop-target");
}

function onColumnDrop(e) {
  if (!currentDrag) return;
  e.preventDefault();

  const colEl = e.currentTarget;
  const wrapper = colEl.closest(".mw-kanban-column-wrapper");
  if (!wrapper) return;

  const targetColumnId = wrapper.getAttribute("data-column-id");
  const cardId = currentDrag.cardId;

  moveCardToColumn(cardId, targetColumnId);
  const card = state.cards[cardId];
  if (card) {
    card.status = targetColumnId;
    card.updatedAt = Date.now();
  }

  saveBoard();
  render();
}

function onColumnDragLeave(e) {
  const colEl = e.currentTarget;
  colEl.classList.remove("is-drop-target");
}

function findColumnIdForCard(cardId) {
  const { columnCards } = state;
  for (const colId in columnCards) {
    if (columnCards[colId].includes(cardId)) return colId;
  }
  return null;
}

function moveCardToColumn(cardId, targetColumnId) {
  const { columnCards } = state;
  const sourceColumnId = findColumnIdForCard(cardId);
  if (!sourceColumnId) {
    // place directly in target
    if (!columnCards[targetColumnId]) columnCards[targetColumnId] = [];
    if (!columnCards[targetColumnId].includes(cardId)) {
      columnCards[targetColumnId].push(cardId);
    }
    return;
  }

  if (sourceColumnId === targetColumnId) return;

  columnCards[sourceColumnId] = columnCards[sourceColumnId].filter(
    id => id !== cardId
  );

  if (!columnCards[targetColumnId]) columnCards[targetColumnId] = [];
  columnCards[targetColumnId].push(cardId);
}

// -------------------- Add Card --------------------

function addCardInline(columnWrapperEl, columnId) {
  const footer = columnWrapperEl.querySelector(".mw-kanban-column-footer");
  if (!footer) return;

  let input = footer.querySelector(".mw-kanban-inline-add");
  if (input) {
    input.focus();
    return;
  }

  input = document.createElement("input");
  input.type = "text";
  input.className = "mw-kanban-inline-add";
  input.placeholder = "Quick add card title…";

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const title = input.value.trim();
      if (!title) {
        footer.removeChild(input);
        return;
      }
      const cardId = createCard(columnId, title);
      footer.removeChild(input);
      currentCardId = cardId;
      saveBoard();
      render();
    } else if (e.key === "Escape") {
      footer.removeChild(input);
    }
  });

  input.addEventListener("blur", () => {
    // Short delay to allow Enter handler to run first
    setTimeout(() => {
      if (input.parentElement === footer) {
        footer.removeChild(input);
      }
    }, 100);
  });

  footer.appendChild(input);
  input.focus();
}

function createCard(columnId, title) {
  const id = "card-" + Date.now();
  const now = Date.now();

  state.cards[id] = {
    id,
    title,
    description: "",
    assigneeId: state.currentUser ? state.currentUser.id : null,
    assigneeName: state.currentUser ? state.currentUser.name : null,
    status: columnId,
    priority: "medium",
    tags: [],
    dueDate: null,
    checklist: [],
    attachments: 0,
    comments: 0,
    createdAt: now,
    updatedAt: now
  };

  if (!state.columnCards[columnId]) {
    state.columnCards[columnId] = [];
  }
  state.columnCards[columnId].unshift(id);

  return id;
}

// -------------------- Utils --------------------

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  if (str == null) return "";
  return String(str).replace(/"/g, "&quot;");
}

function priorityLabel(priority) {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
    default:
      return "Low";
  }
}

function formatDateInput(date) {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}
