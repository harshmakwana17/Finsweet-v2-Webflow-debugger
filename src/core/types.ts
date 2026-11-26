export type Severity = 'error' | 'warning' | 'verify' | 'info';
export type Confidence = 'verified' | 'partial' | 'requires-verification';
export type SolutionKey =
  | 'global'
  | 'filter'
  | 'sort'
  | 'load'
  | 'slider'
  | 'select'
  | 'tabs'
  | 'nest'
  | 'combine'
  | 'inject';

export interface NormalizedAttribute {
  name: string;
  sourceName: string;
  value: string | null;
  bound: boolean;
  unresolved: boolean;
}

export interface ElementCapabilities {
  attributes: boolean;
  customAttributes: boolean;
  children: boolean;
  displayName: boolean;
  domId: boolean;
  settings: boolean;
}

export interface NormalizedElement {
  id: string;
  rawId: string | { component: string; element: string };
  raw: unknown;
  type: string;
  tag: string | null;
  displayName: string | null;
  attributes: NormalizedAttribute[];
  parentId: string | null;
  childIds: string[];
  capabilities: ElementCapabilities;
}

export interface ScanSnapshot {
  pageId: string;
  pageName: string;
  scannedAt: string;
  elements: NormalizedElement[];
  byId: Map<string, NormalizedElement>;
  attributeIndex: Map<string, NormalizedElement[]>;
  scriptAccess: 'available' | 'unavailable' | 'unknown';
  scriptEvidence: string[];
}

export interface DetectedSolution {
  key: SolutionKey;
  evidenceIds: string[];
  instances: string[];
}

export interface IssueEvidence {
  label: string;
  detail: string;
}

export interface FixOperation {
  kind: 'set' | 'remove';
  elementId: string;
  name: string;
  value?: string;
}

export interface FixPrecondition {
  description: string;
  check: (snapshot: ScanSnapshot) => boolean;
}

export interface FixPlan {
  id: string;
  title: string;
  description: string;
  operations: FixOperation[];
  preconditions: FixPrecondition[];
}

export interface Issue {
  id: string;
  ruleId: string;
  solution: SolutionKey;
  severity: Severity;
  confidence: Confidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  evidence: IssueEvidence[];
  elementIds: string[];
  breadcrumb: string[];
  docsUrl: string;
  fix?: FixPlan;
  manualSteps?: string[];
}

export interface HealthScore {
  value: number | null;
  label: string;
  summary: string;
  counts: Record<Severity, number>;
}

export interface RuleContext {
  snapshot: ScanSnapshot;
  solutions: DetectedSolution[];
  helpers: RuleHelpers;
}

export interface RuleHelpers {
  attr: (
    element: NormalizedElement,
    name: string
  ) => NormalizedAttribute | undefined;
  attrValue: (element: NormalizedElement, name: string) => string | null;
  byAttr: (name: string, value?: string) => NormalizedElement[];
  children: (element: NormalizedElement) => NormalizedElement[];
  descendants: (element: NormalizedElement) => NormalizedElement[];
  ancestor: (
    element: NormalizedElement,
    predicate: (candidate: NormalizedElement) => boolean
  ) => NormalizedElement | null;
  ancestors: (element: NormalizedElement) => NormalizedElement[];
  instanceOf: (
    element: NormalizedElement,
    namespace?: 'fs-list' | 'fs-inject'
  ) => string;
  inScope: (
    element: NormalizedElement,
    scope: string,
    namespace?: 'fs-list' | 'fs-inject'
  ) => boolean;
  label: (element: NormalizedElement) => string;
  breadcrumb: (element: NormalizedElement) => string[];
  isCollectionItemHost: (element: NormalizedElement) => boolean;
  isForm: (element: NormalizedElement) => boolean;
  isSelect: (element: NormalizedElement) => boolean;
  isCheckboxOrRadio: (element: NormalizedElement) => boolean;
  isSlider: (element: NormalizedElement) => boolean;
  isTabs: (element: NormalizedElement) => boolean;
  isLinkLike: (element: NormalizedElement) => boolean;
  isCmsListHost: (element: NormalizedElement) => boolean;
  isStaticListHost: (element: NormalizedElement) => boolean;
}

export interface Rule {
  id: string;
  solution: SolutionKey;
  title: string;
  severity: Severity;
  confidence: Confidence;
  docsUrl: string;
  detect: (context: RuleContext) => Issue[];
}

export interface ExtensionSettings {
  autoScanOnPageChange: boolean;
  includeVerifyIssues: boolean;
  strictEnums: boolean;
  saveHistory: boolean;
}

export interface HistoryEntry {
  id: string;
  pageId: string;
  pageName: string;
  scannedAt: string;
  score: HealthScore;
  issueCount: number;
  solutionKeys: SolutionKey[];
}
