// /src/modules/flowchart/module.js
// Aries Flowchart module — draw.io–style editor

console.log("FLOWCHART MODULE LOADED v4 (draw.io style, module.js)");

import * as ui from '../shared/ui-kit.js';

export default async function Module(container, project, saved, api) {
  const root = ui.apply(container);
  root.classList.add('mw-flowchart');
  root.innerHTML = '';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NODE_W = 170;
  const NODE_H = 60;
  const GRID_SIZE = 24;

  // ---------------- Shell layout ----------------
  const projectName =
    (project && (project.name || project.title || project.key)) || 'Untitled';

  const shell = document.createElement('div');
  shell.className = 'fc-shell';

  // top appbar
  const appbar = document.createElement('div');
  appbar.className = 'fc-appbar';
  appbar.innerHTML = `
    <div class="fc-appbar-left">
      <div class="fc-app-title">Flowchart</div>
      <div class="fc-app-doc">${projectName}</div>
    </div>
    <div class="fc-appbar-center">
      <select class="fc-node-type" aria-label="Default node type">
        <option value="process">Process</option>
        <option value="start">Start</option>
        <option value="decision">Decision</option>
        <option value="end">End</option>
      </select>
      <input type="search" class="fc-search" placeholder="Search steps..." />
      <span class="fc-meta"></span>
    </div>
    <div class="fc-appbar-right">
      <div class="fc-zoom">
        <button type="button" data-action="zoom-out">−</button>
        <span class="fc-zoom-label">100%</span>
        <button type="button" data-action="zoom-in">＋</button>
      </div>
      <button type="button" class="fc-toolbar-btn" data-action="add-step">＋ Step</button>
      <button type="button" class="fc-toolbar-btn" data-action="auto-layout">Auto</button>
      <button type="button" class="fc-toolbar-btn" data-action="fit-view">Fit</button>
      <button type="button" class="fc-toolbar-btn" data-action="export-json">JSON</button>
      <button type="button" class="fc-toolbar-btn" data-action="export-svg">SVG</button>
    </div>
  `;

  // body grid
  const body = document.createElement('div');
  body.className = 'fc-body';

  // left sidebar
  const sidebarLeft = document.createElement('aside');
  sidebarLeft.className = 'fc-sidebar-left';
  sidebarLeft.innerHTML = `
    <div>
      <div class="fc-palette-title">Shapes</div>
      <div class="fc-palette-grid">
        <button type="button" class="fc-palette-item" data-type="start">
          <span class="fc-color-dot" style="background:#22c55e;"></span>
          <span class="fc-palette-label">Start</span>
        </button>
        <button type="button" class="fc-palette-item" data-type="process">
          <span class="fc-color-dot" style="background:#3b82f6;"></span>
          <span class="fc-palette-label">Process</span>
        </button>
        <button type="button" class="fc-palette-item" data-type="decision">
          <span class="fc-color-dot" style="background:#eab308;"></span>
          <span class="fc-palette-label">Decision</span>
        </button>
        <button type="button" class="fc-palette-item" data-type="end">
          <span class="fc-color-dot" style="background:#ef4444;"></span>
          <span class="fc-palette-label">End</span>
        </button>
      </div>
    </div>
  `;

  // center canvas column
  const canvasCol = document.createElement('div');
  canvasCol.className = 'fc-canvas-col';

  const canvasTop = document.createElement('div');
  canvasTop.className = 'fc-canvas-top';
  canvasTop.textContent =
    'Double-click to add · Shift+Click two nodes to connect · Alt/Ctrl+Click link to remove · Scroll to zoom · Middle/Right drag to pan · Delete to remove node';

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'fc-canvas';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Flowchart canvas');

  const defs = document.createElementNS(SVG_NS, 'defs');

  // arrow marker
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', 'fc-arrowhead');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  const markerPath = document.createElementNS(SVG_NS, 'path');
  markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  markerPath.setAttribute('class', 'fc-arrowhead');
  marker.appendChild(markerPath);
  defs.appendChild(marker);

  // grid pattern
  const pattern = document.createElementNS(SVG_NS, 'pattern');
  pattern.setAttribute('id', 'fc-grid');
  pattern.setAttribute('width', String(GRID_SIZE));
  pattern.setAttribute('height', String(GRID_SIZE));
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  const gridPath = document.createElementNS(SVG_NS, 'path');
  gridPath.setAttribute('d', `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`);
  gridPath.setAttribute('fill', 'none');
  gridPath.setAttribute('stroke', '#111827');
  gridPath.setAttribute('stroke-width', '0.6');
  pattern.appendChild(gridPath);
  defs.appendChild(pattern);

  svg.appendChild(defs);

  const viewportGroup = document.createElementNS(SVG_NS, 'g');
  const bgRect = document.createElementNS(SVG_NS, 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', 'url(#fc-grid)');

  const linksGroup = document.createElementNS(SVG_NS, 'g');
  const nodesGroup = document.createElementNS(SVG_NS, 'g');

  viewportGroup.appendChild(bgRect);
  viewportGroup.appendChild(linksGroup);
  viewportGroup.appendChild(nodesGroup);
  svg.appendChild(viewportGroup);

  canvasWrapper.appendChild(svg);

  const hint = document.createElement('div');
  hint.className = 'fc-hint';
  hint.textContent =
    'Double-click to add · Shift+Click two nodes to connect · Alt/Ctrl+Click link to remove · Scroll to zoom · Middle/Right drag to pan · Delete to remove node';
  canvasWrapper.appendChild(hint);

  canvasCol.appendChild(canvasTop);
  canvasCol.appendChild(canvasWrapper);

  // right inspector
  const sidebarRight = document.createElement('aside');
  sidebarRight.className = 'fc-sidebar-right';
  sidebarRight.innerHTML = `
    <div class="fc-inspector-header">
      <div class="fc-inspector-title">Step details</div>
      <span class="fc-inspector-id"></span>
    </div>
    <div class="fc-inspector-body"></div>
  `;

  // assemble
  body.appendChild(sidebarLeft);
  body.appendChild(canvasCol);
  body.appendChild(sidebarRight);
  shell.appendChild(appbar);
  shell.appendChild(body);
  root.appendChild(shell);

  // DOM refs
  const typeSelect = appbar.querySelector('.fc-node-type');
  const searchInput = appbar.querySelector('.fc-search');
  const metaEl = appbar.querySelector('.fc-meta');
  const zoomLabel = appbar.querySelector('.fc-zoom-label');
  const zoomInBtn = appbar.querySelector('button[data-action="zoom-in"]');
  const zoomOutBtn = appbar.querySelector('button[data-action="zoom-out"]');

  const inspectorIdEl = sidebarRight.querySelector('.fc-inspector-id');
  const inspectorBody = sidebarRight.querySelector('.fc-inspector-body');

  const paletteButtons = sidebarLeft.querySelectorAll('.fc-palette-item');

  const btnAdd = appbar.querySelector('button[data-action="add-step"]');
  const btnLayout = appbar.querySelector('button[data-action="auto-layout"]');
  const btnFit = appbar.querySelector('button[data-action="fit-view"]');
  const btnExportJson = appbar.querySelector('button[data-action="export-json"]');
  const btnExportSvg = appbar.querySelector('button[data-action="export-svg"]');

  // ---------------- Load data ----------------
  let payload = null;
  if (saved && typeof saved === 'object') {
    payload = saved;
  } else if (api && typeof api.load === 'function') {
    try {
      const loaded = await api.load();
      if (loaded && typeof loaded === 'object') payload = loaded;
    } catch (_) {}
  }
  if (!payload || typeof payload !== 'object') payload = {};
  if (!Array.isArray(payload.nodes)) payload.nodes = [];
  if (!Array.isArray(payload.links)) payload.links = [];
  if (!payload.view) payload.view = { panX: 0, panY: 0, zoom: 1 };
  if (!payload.settings) payload.settings = { snapToGrid: true };

  const nodes = payload.nodes;
  const links = payload.links;
  const view = payload.view;
  const settings = payload.settings;

  let idCounter = 1;
  nodes.forEach(n => {
    if (!n || typeof n !== 'object') return;
    const num = parseInt(n.id, 10);
    if (!isNaN(num) && num >= idCounter) idCounter = num + 1;
  });
  const newId = () => String(idCounter++);

  function normalizeNode(node) {
    if (!node || typeof node !== 'object') return null;
    return {
      id: node.id || newId(),
      x: typeof node.x === 'number' ? node.x : 0,
      y: typeof node.y === 'number' ? node.y : 0,
      text:
        typeof node.text === 'string' && node.text.trim()
          ? node.text
          : 'New Step',
      type: node.type || 'process',
      detail: typeof node.detail === 'string' ? node.detail : ''
    };
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = normalizeNode(nodes[i]);
    if (n) nodes[i] = n;
  }

  for (let i = links.length - 1; i >= 0; i--) {
    const l = links[i];
    if (!l || !l.fromId || !l.toId) {
      links.splice(i, 1);
    } else if (!l.id) {
      l.id = `link-${newId()}`;
    }
  }

  // ---------------- State ----------------
  const nodeEls = new Map();
  const linkEls = new Map();
  let selectedId = null;
  let dragging = null;
  let saveTimer = null;

  let zoom = typeof view.zoom === 'number' && view.zoom > 0 ? view.zoom : 1;
  let panX = typeof view.panX === 'number' ? view.panX : 0;
  let panY = typeof view.panY === 'number' ? view.panY : 0;
  let isPanning = false;
  let panStart = null;

  let defaultNodeType = (typeSelect && typeSelect.value) || 'process';
  const filterState = { search: '' };

  // ---------------- Utils ----------------
  function snapValue(v) {
    if (!settings.snapToGrid) return v;
    return Math.round(v / GRID_SIZE) * GRID_SIZE;
  }

  function updateZoomLabel() {
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function applyViewportTransform() {
    viewportGroup.setAttribute(
      'transform',
      `translate(${panX},${panY}) scale(${zoom})`
    );
    view.panX = panX;
    view.panY = panY;
    view.zoom = zoom;
    updateZoomLabel();
  }

  function zoomTo(newZoom, anchorX, anchorY) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const mx = anchorX != null ? anchorX : rect.width / 2;
    const my = anchorY != null ? anchorY : rect.height / 2;

    const sx = (mx - panX) / zoom;
    const sy = (my - panY) / zoom;

    zoom = Math.max(0.25, Math.min(newZoom, 3));
    panX = mx - sx * zoom;
    panY = my - sy * zoom;
    applyViewportTransform();
    scheduleSave();
  }

  function linkKey(link) {
    return `${link.fromId}-->${link.toId}`;
  }

  function scheduleSave() {
    if (!api || typeof api.save !== 'function') return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        api.save(payload);
      } catch (_) {}
    }, 600);
  }

  function getNode(id) {
    return nodes.find(n => n.id === id) || null;
  }

  function svgPointFromEvent(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    const sp = pt.matrixTransform(inv);
    const x = (sp.x - panX) / zoom;
    const y = (sp.y - panY) / zoom;
    return { x, y };
  }

  function selectNode(id) {
    selectedId = id;
    for (const [nid, el] of nodeEls.entries()) {
      if (nid === id) el.g.classList.add('fc-node-selected');
      else el.g.classList.remove('fc-node-selected');
    }
    renderInspector();
  }

  // ---------------- Search/meta ----------------
  function applySearchFilter() {
    const term = filterState.search;
    if (!term) {
      for (const el of nodeEls.values())
        el.g.classList.remove('fc-search-dim');
      return nodes.length;
    }
    let matches = 0;
    for (const [id, el] of nodeEls.entries()) {
      const node = getNode(id);
      if (!node) continue;
      const blob = `${node.text || ''} ${node.detail || ''}`.toLowerCase();
      const ok = blob.includes(term);
      if (ok) {
        el.g.classList.remove('fc-search-dim');
        matches++;
      } else {
        el.g.classList.add('fc-search-dim');
      }
    }
    return matches;
  }

  function updateMeta(matchOverride) {
    if (!metaEl) return;
    const totalNodes = nodes.length;
    const totalLinks = links.length;
    const term = filterState.search;
    if (!totalNodes && !totalLinks) {
      metaEl.textContent = 'No steps yet.';
      return;
    }
    if (term) {
      const matches =
        typeof matchOverride === 'number' ? matchOverride : applySearchFilter();
      metaEl.textContent = `${totalNodes} steps · ${totalLinks} connections · ${matches} match${
        matches === 1 ? '' : 'es'
      }`;
    } else {
      metaEl.textContent = `${totalNodes} steps · ${totalLinks} connections`;
    }
  }

  // ---------------- Links ----------------
  function updateLinkPath(link, path) {
    const from = getNode(link.fromId);
    const to = getNode(link.toId);
    if (!from || !to) return;

    const startX = from.x;
    const startY = from.y + NODE_H / 2;
    const endX = to.x;
    const endY = to.y - NODE_H / 2;

    const midY = (startY + endY) / 2;
    const d = [
      `M ${startX} ${startY}`,
      `L ${startX} ${midY}`,
      `L ${endX} ${midY}`,
      `L ${endX} ${endY}`
    ].join(' ');
    path.setAttribute('d', d);
  }

  function updateLinksForNode(nodeId) {
    for (const link of links) {
      if (link.fromId === nodeId || link.toId === nodeId) {
        const entry = linkEls.get(linkKey(link));
        if (entry) updateLinkPath(link, entry.path);
      }
    }
  }

  function deleteLink(link) {
    const idx = links.indexOf(link);
    if (idx !== -1) links.splice(idx, 1);
    const key = linkKey(link);
    const entry = linkEls.get(key);
    if (entry && entry.path.parentNode) {
      entry.path.parentNode.removeChild(entry.path);
    }
    linkEls.delete(key);
    scheduleSave();
    const matches = applySearchFilter();
    updateMeta(matches);
  }

  function createLinkIfMissing(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const exists = links.some(l => l.fromId === fromId && l.toId === toId);
    if (exists) return;
    const link = { id: `link-${newId()}`, fromId, toId };
    links.push(link);
    createLinkElement(link);
    scheduleSave();
    const matches = applySearchFilter();
    updateMeta(matches);
  }

  // ---------------- Inspector ----------------
  function renderInspector() {
    inspectorBody.innerHTML = '';
    inspectorIdEl.textContent = '';

    // canvas settings row
    const canvasField = document.createElement('div');
    canvasField.className = 'fc-field';
    const lbl = document.createElement('label');
    lbl.textContent = 'Canvas';
    const row = document.createElement('label');
    row.className = 'fc-canvas-settings-row';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    if (settings.snapToGrid) chk.checked = true;
    chk.addEventListener('change', e => {
      settings.snapToGrid = !!e.target.checked;
      scheduleSave();
    });
    row.appendChild(chk);
    row.appendChild(
      document.createTextNode('Snap to grid (perfect alignment)')
    );
    canvasField.appendChild(lbl);
    canvasField.appendChild(row);
    inspectorBody.appendChild(canvasField);

    if (!selectedId) {
      inspectorBody.innerHTML += `
        <div class="fc-inspector-empty">Select a step to edit its details.</div>
        <div class="fc-key-hints">
          <strong>Shortcuts:</strong><br>
          Ctrl/Cmd + A → add centered step · Ctrl/Cmd + L → auto layout · Delete → remove selected node
        </div>`;
      return;
    }

    const node = getNode(selectedId);
    if (!node) {
      inspectorBody.innerHTML += `<div class="fc-inspector-empty">Selected step not found.</div>`;
      return;
    }

    inspectorIdEl.textContent = `#${node.id}`;

    const titleField = document.createElement('div');
    titleField.className = 'fc-field';
    titleField.innerHTML = `
      <label>Title</label>
      <input type="text" value="${node.text || ''}">
    `;
    const titleInput = titleField.querySelector('input');
    titleInput.addEventListener('input', e => {
      node.text = e.target.value || 'New Step';
      const el = nodeEls.get(node.id);
      if (el) el.label.textContent = node.text;
      scheduleSave();
      const matches = applySearchFilter();
      updateMeta(matches);
    });

    const typeField = document.createElement('div');
    typeField.className = 'fc-field';
    typeField.innerHTML = `
      <label>Type</label>
      <select>
        <option value="start">Start</option>
        <option value="process">Process</option>
        <option value="decision">Decision</option>
        <option value="end">End</option>
      </select>
    `;
    const typeSelectNode = typeField.querySelector('select');
    typeSelectNode.value = node.type || 'process';
    typeSelectNode.addEventListener('change', e => {
      node.type = e.target.value || 'process';
      const el = nodeEls.get(node.id);
      if (el) {
        el.g.dataset.type = node.type;
        rebuildNodeShape(el);
      }
      scheduleSave();
    });

    const descField = document.createElement('div');
    descField.className = 'fc-field';
    descField.innerHTML = `
      <label>Description / notes</label>
      <textarea>${node.detail || ''}</textarea>
    `;
    const descInput = descField.querySelector('textarea');
    descInput.addEventListener('input', e => {
      node.detail = e.target.value;
      scheduleSave();
      const matches = applySearchFilter();
      updateMeta(matches);
    });

    inspectorBody.appendChild(titleField);
    inspectorBody.appendChild(typeField);
    inspectorBody.appendChild(descField);

    const hints = document.createElement('div');
    hints.className = 'fc-key-hints';
    hints.innerHTML = `
      <strong>Tips:</strong><br>
      • Shift+Click another step to connect.<br>
      • Use the “+” handle to create a child node.<br>
      • Arrow keys nudge the selected node (Shift = bigger).`;
    inspectorBody.appendChild(hints);
  }

  // ---------------- Nodes ----------------
  function rebuildNodeShape(el) {
    const { node, g } = el;
    if (el.mainShape && el.mainShape.parentNode) {
      el.mainShape.parentNode.removeChild(el.mainShape);
    }
    let shape;
    if (node.type === 'decision') {
      shape = document.createElementNS(SVG_NS, 'path');
      shape.classList.add('fc-node-diamond');
      const w = NODE_W;
      const h = NODE_H;
      const x = node.x;
      const y = node.y;
      const d = [
        `M ${x} ${y - h / 2}`,
        `L ${x + w / 2} ${y}`,
        `L ${x} ${y + h / 2}`,
        `L ${x - w / 2} ${y}`,
        'Z'
      ].join(' ');
      shape.setAttribute('d', d);
    } else {
      shape = document.createElementNS(SVG_NS, 'rect');
      shape.classList.add('fc-node-rect');
      const rx =
        node.type === 'start' || node.type === 'end' ? NODE_H / 2 : 12;
      shape.setAttribute('x', node.x - NODE_W / 2);
      shape.setAttribute('y', node.y - NODE_H / 2);
      shape.setAttribute('width', NODE_W);
      shape.setAttribute('height', NODE_H);
      shape.setAttribute('rx', rx);
      shape.setAttribute('ry', rx);
    }
    g.insertBefore(shape, el.label);
    el.mainShape = shape;
  }

  function updateNodeElement(node) {
    const el = nodeEls.get(node.id);
    if (!el) return;
    const { label, handleGroup } = el;
    label.setAttribute('x', node.x);
    label.setAttribute('y', node.y);
    label.textContent = node.text || 'New Step';
    el.g.dataset.type = node.type || 'process';
    rebuildNodeShape(el);
    if (handleGroup) {
      const handleY = node.y + NODE_H / 2 + 10;
      handleGroup.setAttribute('transform', `translate(${node.x},${handleY})`);
    }
  }

  function deleteNode(nodeId) {
    const idx = nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) return;
    nodes.splice(idx, 1);

    const el = nodeEls.get(nodeId);
    if (el && el.g.parentNode) el.g.parentNode.removeChild(el.g);
    nodeEls.delete(nodeId);

    for (let i = links.length - 1; i >= 0; i--) {
      const l = links[i];
      if (l.fromId === nodeId || l.toId === nodeId) deleteLink(l);
    }

    if (selectedId === nodeId) selectedId = null;
    scheduleSave();
    const matches = applySearchFilter();
    updateMeta(matches);
    renderInspector();
  }

  function addChildFromNode(parentNode) {
    let x = parentNode.x;
    let y = parentNode.y + NODE_H + 70;
    x = snapValue(x);
    y = snapValue(y);
    const child = {
      id: newId(),
      x,
      y,
      text: 'New Step',
      type: defaultNodeType || 'process',
      detail: ''
    };
    nodes.push(child);
    createNodeElement(child);
    createLinkIfMissing(parentNode.id, child.id);
    selectNode(child.id);
    scheduleSave();
  }

  function createNodeElement(node) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('fc-node');
    g.setAttribute('tabindex', '0');
    g.dataset.type = node.type || 'process';
    g.setAttribute('aria-label', node.text || 'Flow step');

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.textContent = node.text || 'New Step';
    g.appendChild(label);

    const handleGroup = document.createElementNS(SVG_NS, 'g');
    handleGroup.classList.add('fc-node-add');
    const handleCircle = document.createElementNS(SVG_NS, 'circle');
    handleCircle.setAttribute('r', '9');
    const handleText = document.createElementNS(SVG_NS, 'text');
    handleText.setAttribute('text-anchor', 'middle');
    handleText.setAttribute('dominant-baseline', 'central');
    handleText.textContent = '+';
    handleGroup.appendChild(handleCircle);
    handleGroup.appendChild(handleText);
    g.appendChild(handleGroup);

    nodesGroup.appendChild(g);

    const onMouseMoveNode = evt => {
      if (!dragging || dragging.id !== node.id) return;
      const pt = svgPointFromEvent(evt);
      node.x = snapValue(pt.x - dragging.dx);
      node.y = snapValue(pt.y - dragging.dy);
      updateNodeElement(node);
      updateLinksForNode(node.id);
    };

    const onMouseUpNode = () => {
      if (!dragging || dragging.id !== node.id) return;
      dragging = null;
      window.removeEventListener('mousemove', onMouseMoveNode);
      window.removeEventListener('mouseup', onMouseUpNode);
      scheduleSave();
    };

    const onMouseDown = evt => {
      if (
        evt.button === 0 &&
        evt.target !== handleCircle &&
        evt.target !== handleText
      ) {
        evt.stopPropagation();
        if (evt.shiftKey && selectedId && selectedId !== node.id) {
          createLinkIfMissing(selectedId, node.id);
          return;
        }
        selectNode(node.id);
        const pt = svgPointFromEvent(evt);
        dragging = { id: node.id, dx: pt.x - node.x, dy: pt.y - node.y };
        window.addEventListener('mousemove', onMouseMoveNode);
        window.addEventListener('mouseup', onMouseUpNode);
      }
    };

    const onClick = evt => {
      if (evt.target === handleCircle || evt.target === handleText) return;
      evt.stopPropagation();
      if (evt.shiftKey && selectedId && selectedId !== node.id) {
        createLinkIfMissing(selectedId, node.id);
      } else {
        selectNode(node.id);
      }
    };

    const onDblClick = evt => {
      evt.stopPropagation();
      selectNode(node.id);
      const input = inspectorBody.querySelector('input[type="text"]');
      if (input) {
        input.focus();
        input.select();
      }
    };

    const onKeyDown = evt => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        selectNode(node.id);
      } else if (
        evt.key === 'ArrowUp' ||
        evt.key === 'ArrowDown' ||
        evt.key === 'ArrowLeft' ||
        evt.key === 'ArrowRight'
      ) {
        evt.preventDefault();
        const base = evt.shiftKey ? GRID_SIZE : 4;
        if (evt.key === 'ArrowUp') node.y -= base;
        if (evt.key === 'ArrowDown') node.y += base;
        if (evt.key === 'ArrowLeft') node.x -= base;
        if (evt.key === 'ArrowRight') node.x += base;
        node.x = snapValue(node.x);
        node.y = snapValue(node.y);
        updateNodeElement(node);
        updateLinksForNode(node.id);
        scheduleSave();
      }
    };

    const onHandleClick = evt => {
      evt.stopPropagation();
      addChildFromNode(node);
    };

    g.addEventListener('mousedown', onMouseDown);
    g.addEventListener('click', onClick);
    g.addEventListener('dblclick', onDblClick);
    g.addEventListener('keydown', onKeyDown);
    handleGroup.addEventListener('click', onHandleClick);

    const el = { g, node, label, handleGroup, mainShape: null };
    nodeEls.set(node.id, el);
    updateNodeElement(node);
  }

  // ---------------- Link elements ----------------
  function createLinkElement(link) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.classList.add('fc-link');
    path.setAttribute('marker-end', 'url(#fc-arrowhead)');
    updateLinkPath(link, path);
    linksGroup.appendChild(path);
    linkEls.set(linkKey(link), { path, link });

    path.addEventListener('click', e => {
      if (e.altKey || e.metaKey || e.ctrlKey) {
        e.stopPropagation();
        deleteLink(link);
      }
    });
  }

  function renderAll() {
    nodeEls.clear();
    linkEls.clear();
    while (nodesGroup.firstChild) nodesGroup.removeChild(nodesGroup.firstChild);
    while (linksGroup.firstChild) linksGroup.removeChild(linksGroup.firstChild);
    nodes.forEach(createNodeElement);
    links.forEach(createLinkElement);
    selectNode(selectedId && getNode(selectedId) ? selectedId : null);
    const matches = applySearchFilter();
    updateMeta(matches);
    fitToView(true);
  }

  // ---------------- Actions ----------------
  function addStepAt(x, y, typeOverride) {
    x = snapValue(x);
    y = snapValue(y);
    const node = {
      id: newId(),
      x,
      y,
      text: 'New Step',
      type: typeOverride || defaultNodeType || 'process',
      detail: ''
    };
    nodes.push(node);
    createNodeElement(node);
    selectNode(node.id);
    scheduleSave();
    const matches = applySearchFilter();
    updateMeta(matches);
  }

  function addStepCentered(typeOverride) {
    const rect = svg.getBoundingClientRect();
    const ctm = svg.getScreenCTM();
    if (!ctm || !rect.width || !rect.height) {
      addStepAt(0, 0, typeOverride);
      return;
    }
    const pt = svg.createSVGPoint();
    pt.x = rect.left + rect.width / 2;
    pt.y = rect.top + rect.height / 2;
    const sp = pt.matrixTransform(ctm.inverse());
    const x = (sp.x - panX) / zoom;
    const y = (sp.y - panY) / zoom;
    addStepAt(x, y, typeOverride);
  }

  function autoLayout() {
    if (!nodes.length) return;

    const adjacency = new Map();
    nodes.forEach(n => adjacency.set(n.id, []));
    links.forEach(l => {
      const arr = adjacency.get(l.fromId);
      if (arr) arr.push(l.toId);
    });

    const indegree = new Map();
    nodes.forEach(n => indegree.set(n.id, 0));
    links.forEach(l =>
      indegree.set(l.toId, (indegree.get(l.toId) || 0) + 1)
    );

    const layers = [];
    const visited = new Set();
    let currentLayer = nodes.filter(n => (indegree.get(n.id) || 0) === 0);
    if (!currentLayer.length) currentLayer = [...nodes];

    while (currentLayer.length) {
      layers.push(currentLayer);
      currentLayer.forEach(n => visited.add(n.id));
      const nextSet = new Set();
      currentLayer.forEach(n => {
        const outs = adjacency.get(n.id) || [];
        outs.forEach(id => {
          if (!visited.has(id)) nextSet.add(id);
        });
      });
      currentLayer = [...nextSet];
    }

    const rect = svg.getBoundingClientRect();
    const baseWidth = rect.width || 800;
    const baseHeight = rect.height || 600;
    const layerGapY = NODE_H + 80;

    layers.forEach((layer, li) => {
      const totalWidth = layer.length * NODE_W + (layer.length - 1) * 50;
      let startX =
        baseWidth / (2 * zoom) - panX / zoom - totalWidth / 2 + NODE_W / 2;
      let y = baseHeight / (3 * zoom) - panY / zoom + li * layerGapY;
      startX = snapValue(startX);
      y = snapValue(y);
      layer.forEach((node, idx) => {
        node.x = snapValue(startX + idx * (NODE_W + 50));
        node.y = y;
        updateNodeElement(node);
        updateLinksForNode(node.id);
      });
    });

    scheduleSave();
    const matches = applySearchFilter();
    updateMeta(matches);
    fitToView(false);
  }

  function exportJson() {
    const data = JSON.stringify(payload, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const baseName =
      (project && (project.slug || project.key || project.name)) ||
      'flowchart';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.flowchart.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportSvg() {
    const rect = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(clone);
    const blob = new Blob([svgText], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const baseName =
      (project && (project.slug || project.key || project.name)) ||
      'flowchart';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.flowchart.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------- Zoom & pan ----------------
  function onWheel(evt) {
    evt.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const zoomFactor = evt.ctrlKey ? 0.04 : 0.12;
    const delta = -Math.sign(evt.deltaY) * zoomFactor;
    const newZoom = zoom * (1 + delta);
    zoomTo(newZoom, mouseX, mouseY);
  }

  function startPan(evt) {
    if (evt.button !== 1 && evt.button !== 2) return;
    evt.preventDefault();
    isPanning = true;
    panStart = { x: evt.clientX, y: evt.clientY, panX, panY };
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', endPan);
  }

  function onPanMove(evt) {
    if (!isPanning || !panStart) return;
    const dx = evt.clientX - panStart.x;
    const dy = evt.clientY - panStart.y;
    panX = panStart.panX + dx;
    panY = panStart.panY + dy;
    applyViewportTransform();
  }

  function endPan() {
    if (!isPanning) return;
    isPanning = false;
    panStart = null;
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', endPan);
    scheduleSave();
  }

  function fitToView(initial) {
    if (!nodes.length) {
      if (initial) {
        zoom = 1;
        panX = 0;
        panY = 0;
        applyViewportTransform();
      }
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x - NODE_W / 2);
      maxX = Math.max(maxX, n.x + NODE_W / 2);
      minY = Math.min(minY, n.y - NODE_H / 2);
      maxY = Math.max(maxY, n.y + NODE_H / 2);
    });
    const width = maxX - minX || NODE_W;
    const height = maxY - minY || NODE_H;
    const rect = svg.getBoundingClientRect();
    const paddingFactor = 1.6;
    const scaleX = rect.width / (width * paddingFactor);
    const scaleY = rect.height / (height * paddingFactor);
    zoom = Math.max(0.25, Math.min(scaleX, scaleY, 2));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    panX = rect.width / 2 - cx * zoom;
    panY = rect.height / 2 - cy * zoom;
    applyViewportTransform();
    scheduleSave();
  }

  // ---------------- Canvas & keyboard ----------------
  function onCanvasMouseDown(evt) {
    if (evt.button === 0 && evt.target === svg) {
      selectNode(null);
    } else if (evt.button === 1 || evt.button === 2) {
      startPan(evt);
    }
  }

  function onCanvasDblClick(evt) {
    if (evt.target !== svg) return;
    const pt = svgPointFromEvent(evt);
    addStepAt(pt.x, pt.y);
  }

  function onKeyDownRoot(evt) {
    const tag = ((evt.target && evt.target.tagName) || '').toLowerCase();
    const isTextInput =
      tag === 'input' ||
      tag === 'textarea' ||
      (evt.target && evt.target.isContentEditable);
    if (isTextInput) return;

    const key = (evt.key || '').toLowerCase();

    if ((evt.metaKey || evt.ctrlKey) && key === 'a') {
      evt.preventDefault();
      addStepCentered();
      return;
    }
    if ((evt.metaKey || evt.ctrlKey) && key === 'l') {
      evt.preventDefault();
      autoLayout();
      return;
    }
    if ((evt.metaKey || evt.ctrlKey) && key === 'f') {
      evt.preventDefault();
      if (searchInput) searchInput.focus();
      return;
    }
    if (key === 'delete' || key === 'backspace') {
      if (selectedId) {
        evt.preventDefault();
        deleteNode(selectedId);
      }
    }
  }

  // ---------------- Wire up ----------------
  const onAddClick = () => addStepCentered();
  const onLayoutClick = () => autoLayout();
  const onFitClick = () => fitToView(false);
  const onExportJsonClick = () => exportJson();
  const onExportSvgClick = () => exportSvg();
  const onTypeChange = e => {
    defaultNodeType = e.target.value || 'process';
  };
  const onSearchChange = e => {
    filterState.search = (e.target.value || '').trim().toLowerCase();
    const matches = applySearchFilter();
    updateMeta(matches);
  };
  const onZoomInClick = () => zoomTo(zoom * 1.15);
  const onZoomOutClick = () => zoomTo(zoom / 1.15);

  if (btnAdd) btnAdd.addEventListener('click', onAddClick);
  if (btnLayout) btnLayout.addEventListener('click', onLayoutClick);
  if (btnFit) btnFit.addEventListener('click', onFitClick);
  if (btnExportJson)
    btnExportJson.addEventListener('click', onExportJsonClick);
  if (btnExportSvg) btnExportSvg.addEventListener('click', onExportSvgClick);
  if (typeSelect) typeSelect.addEventListener('change', onTypeChange);
  if (searchInput) searchInput.addEventListener('input', onSearchChange);
  if (zoomInBtn) zoomInBtn.addEventListener('click', onZoomInClick);
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', onZoomOutClick);

  const paletteHandlers = [];
  paletteButtons.forEach(btn => {
    const type = btn.getAttribute('data-type');
    const handler = () => addStepCentered(type);
    paletteHandlers.push({ btn, handler });
    btn.addEventListener('click', handler);
  });

  svg.addEventListener('mousedown', onCanvasMouseDown);
  svg.addEventListener('dblclick', onCanvasDblClick);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('contextmenu', e => e.preventDefault());
  root.addEventListener('keydown', onKeyDownRoot);

  // ---------------- Initial render ----------------
  renderAll();
  applyViewportTransform();

  // ---------------- API ----------------
  function getData() {
    return payload;
  }

  function destroy() {
    if (btnAdd) btnAdd.removeEventListener('click', onAddClick);
    if (btnLayout) btnLayout.removeEventListener('click', onLayoutClick);
    if (btnFit) btnFit.removeEventListener('click', onFitClick);
    if (btnExportJson)
      btnExportJson.removeEventListener('click', onExportJsonClick);
    if (btnExportSvg)
      btnExportSvg.removeEventListener('click', onExportSvgClick);
    if (typeSelect) typeSelect.removeEventListener('change', onTypeChange);
    if (searchInput) searchInput.removeEventListener('input', onSearchChange);
    if (zoomInBtn) zoomInBtn.removeEventListener('click', onZoomInClick);
    if (zoomOutBtn) zoomOutBtn.removeEventListener('click', onZoomOutClick);

    paletteHandlers.forEach(({ btn, handler }) =>
      btn.removeEventListener('click', handler)
    );

    svg.removeEventListener('mousedown', onCanvasMouseDown);
    svg.removeEventListener('dblclick', onCanvasDblClick);
    svg.removeEventListener('wheel', onWheel);
    root.removeEventListener('keydown', onKeyDownRoot);
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', endPan);

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    root.innerHTML = '';
  }

  return { getData, destroy };
}
