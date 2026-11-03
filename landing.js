/**
 * @fileoverview Centralized Configuration, Theme Controller & Live Side-Panel Simulator
 * for the Drive Workspace Explorer official product landing page.
 */

(function() {
  'use strict';

  /**
   * Single Source of Truth for Landing Page URLs, selectors, and demo hierarchy data.
   * Modify `CHROME_STORE_URL` here once the extension is published.
   * @const {Object}
   */
  const SITE_CONFIG = Object.freeze({
    CHROME_STORE_URL: 'https://chrome.google.com/webstore',
    THEME_STORAGE_KEY: 'dwe_landing_theme_v1',
    SELECTORS: Object.freeze({
      STORE_LINKS: '.js-store-link',
      THEME_TOGGLE: '#theme-toggle',
      SIM_TREE_ROOT: '#sim-tree-root',
      SIM_SEARCH_INPUT: '#sim-search-input',
      SIM_VIEW_BTNS: '.sim-view-btn',
      SIM_SELECTED_TITLE: '#sim-selected-title',
      SIM_SELECTED_META: '#sim-selected-meta',
    }),
    DEMO_DATASETS: Object.freeze({
      'my-drive': Object.freeze([
        {
          id: 'fld-2027',
          name: 'Product Launch 2027',
          isFolder: true,
          expanded: true,
          meta: 'Folder',
          children: [
            { id: 'doc-arch', name: 'Architecture_Spec_v3.gdoc', isFolder: false, meta: '420 KB' },
            { id: 'sld-keynote', name: 'Keynote_Deck_2027.gslides', isFolder: false, meta: '18.4 MB' },
            { id: 'sht-metrics', name: 'Q4_Growth_Model.gsheet', isFolder: false, meta: '1.2 MB' },
          ],
        },
        {
          id: 'fld-design',
          name: 'Material 3 Design System',
          isFolder: true,
          expanded: false,
          meta: 'Folder',
          children: [
            { id: 'fig-icons', name: 'Drive_Delta_Glyph.svg', isFolder: false, meta: '24 KB' },
            { id: 'pdf-brand', name: 'Brand_Guidelines.pdf', isFolder: false, meta: '8.9 MB' },
          ],
        },
        { id: 'pdf-sec', name: 'OAuth2_Security_Audit.pdf', isFolder: false, meta: '3.1 MB' },
        { id: 'zip-rel', name: 'drive-explorer-v1.0.0.zip', isFolder: false, meta: '68 KB' },
      ]),
      'starred': Object.freeze([
        { id: 'sld-keynote', name: '★ Keynote_Deck_2027.gslides', isFolder: false, meta: '18.4 MB' },
        { id: 'doc-arch', name: '★ Architecture_Spec_v3.gdoc', isFolder: false, meta: '420 KB' },
      ]),
    }),
  });

  // Mutable working copy of the demo datasets so expanding/collapsing never mutates SITE_CONFIG
  const state = {
    currentView: 'my-drive',
    currentFilter: '',
    datasets: JSON.parse(JSON.stringify(SITE_CONFIG.DEMO_DATASETS)),
  };

  /**
   * Hydrates all Chrome Web Store CTA buttons from `SITE_CONFIG.CHROME_STORE_URL`.
   */
  function initStoreLinks() {
    document.querySelectorAll(SITE_CONFIG.SELECTORS.STORE_LINKS).forEach((link) => {
      link.href = SITE_CONFIG.CHROME_STORE_URL;
    });
  }

  /**
   * Initializes Light/Dark mode toggle with safe localStorage persistence.
   */
  function initThemeToggle() {
    const root = document.documentElement;
    try {
      const savedTheme = window.localStorage.getItem(SITE_CONFIG.THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        root.setAttribute('data-theme', savedTheme);
      }
    } catch (e) {}

    const btn = document.querySelector(SITE_CONFIG.SELECTORS.THEME_TOGGLE);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nextTheme);
      try {
        window.localStorage.setItem(SITE_CONFIG.THEME_STORAGE_KEY, nextTheme);
      } catch (e) {}
    });
  }

  /**
   * Updates the telemetry inspection card when a user clicks a node in the simulator.
   * @param {!Object} item
   */
  function updateTelemetryCard(item) {
    const titleEl = document.querySelector(SITE_CONFIG.SELECTORS.SIM_SELECTED_TITLE);
    const metaEl = document.querySelector(SITE_CONFIG.SELECTORS.SIM_SELECTED_META);
    if (!titleEl || !metaEl) return;

    const icon = item.isFolder ? '📁' : '📄';
    titleEl.textContent = `${icon} ${item.name}`;
    metaEl.textContent = `ID: ${item.id} · Size: ${item.meta} · Cache Latency: 0.1ms`;
  }

  /**
   * Recursively builds DOM nodes for the interactive Side Panel simulator.
   * @param {!Array<!Object>} items
   * @param {string} filterQuery
   * @return {!DocumentFragment}
   */
  function buildDemoNodes(items, filterQuery) {
    const frag = document.createDocumentFragment();
    const q = (filterQuery || '').trim().toLowerCase();

    items.forEach((item) => {
      const selfMatches = !q || item.name.toLowerCase().includes(q);
      const matchingChildren = (item.children || []).filter(
        (c) => !q || c.name.toLowerCase().includes(q)
      );

      if (!selfMatches && matchingChildren.length === 0) return;

      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'sim-node-row';

      const isExpanded = q ? true : Boolean(item.expanded);
      const iconSpan = document.createElement('span');
      iconSpan.textContent = item.isFolder ? (isExpanded ? '📂' : '📁') : '📄';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'sim-node-meta';
      metaSpan.textContent = item.meta;

      row.append(iconSpan, nameSpan, metaSpan);
      row.addEventListener('click', () => {
        if (item.isFolder) {
          item.expanded = !item.expanded;
          renderDemoTree();
        }
        updateTelemetryCard(item);
      });

      li.appendChild(row);

      if (item.isFolder && isExpanded && item.children) {
        const subUl = document.createElement('ul');
        const childrenToRender = q ? matchingChildren : item.children;
        subUl.appendChild(buildDemoNodes(childrenToRender, ''));
        li.appendChild(subUl);
      }

      frag.appendChild(li);
    });

    return frag;
  }

  /**
   * Renders the active dataset into the simulator tree container.
   */
  function renderDemoTree() {
    const rootEl = document.querySelector(SITE_CONFIG.SELECTORS.SIM_TREE_ROOT);
    if (!rootEl) return;
    rootEl.textContent = '';
    const dataset = state.datasets[state.currentView] || [];
    rootEl.appendChild(buildDemoNodes(dataset, state.currentFilter));
  }

  /**
   * Wires search input and workspace view tabs inside the simulator.
   */
  function initSimulator() {
    const searchInput = document.querySelector(SITE_CONFIG.SELECTORS.SIM_SEARCH_INPUT);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.currentFilter = e.target.value;
        renderDemoTree();
      });
    }

    document.querySelectorAll(SITE_CONFIG.SELECTORS.SIM_VIEW_BTNS).forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(SITE_CONFIG.SELECTORS.SIM_VIEW_BTNS).forEach((b) => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        state.currentView = btn.dataset.view;
        renderDemoTree();
      });
    });

    renderDemoTree();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStoreLinks();
    initThemeToggle();
    initSimulator();
  });
})();
