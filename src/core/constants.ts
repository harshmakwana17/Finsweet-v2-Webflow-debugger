export const DOCS = {
  filter: 'https://finsweet.com/attributes/list-filter',
  sort: 'https://finsweet.com/attributes/list-sort',
  load: 'https://finsweet.com/attributes/list-load',
  slider: 'https://finsweet.com/attributes/list-slider',
  select: 'https://finsweet.com/attributes/list-select',
  nest: 'https://finsweet.com/attributes/list-nest',
  combine: 'https://finsweet.com/attributes/list-combine',
  tabs: 'https://finsweet.com/attributes/list-tabs',
  inject: 'https://finsweet.com/attributes/inject',
  global: 'https://finsweet.com/attributes/how-to-set-the-script-tag',
  instances: 'https://finsweet.com/attributes/how-to-use-multiple-instances',
  staticLists: 'https://finsweet.com/attributes/how-to-use-non-cms-lists',
} as const;

export const LIST_SCRIPT_SNIPPET =
  '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-list></script>';

export const INJECT_SCRIPT_SNIPPET =
  '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-inject></script>';

export const DEFAULT_SETTINGS = {
  autoScanOnPageChange: true,
  includeVerifyIssues: true,
  strictEnums: true,
  saveHistory: true,
} as const;

export const STORAGE_KEYS = {
  settings: 'fs-v2-debugger.settings.v1',
  history: 'fs-v2-debugger.history.v1',
  reviewed: 'fs-v2-debugger.reviewed.v1',
} as const;
