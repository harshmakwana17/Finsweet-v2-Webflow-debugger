import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DOCS,
  INJECT_SCRIPT_SNIPPET,
  LIST_SCRIPT_SNIPPET,
} from './core/constants';
import { applyFix } from './core/fix-engine';
import { calculateScore } from './core/score';
import { runRules, type ScanResult } from './core/issue-engine';
import { scanDesigner } from './core/scanner';
import { solutionLabel } from './core/solution-detector';
import {
  appendHistory,
  clearHistory,
  loadHistory,
  loadReviewed,
  loadSettings,
  saveReviewed,
  saveSettings,
} from './core/storage';
import type {
  ExtensionSettings,
  HistoryEntry,
  Issue,
  Severity,
  SolutionKey,
} from './core/types';
import {
  createWebflowDesignerClient,
  type DesignerClient,
  type ElementRef,
  type ExtensionSize,
} from './webflow/designer-client';

type View = 'dashboard' | 'issues' | 'solutions' | 'history' | 'settings';
type SeverityFilter = Severity | 'all';
type SolutionFilter = SolutionKey | 'all';

interface StatusMessage {
  kind: 'info' | 'success' | 'error';
  text: string;
}

const VIEWS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Overview', icon: '✦' },
  { id: 'issues', label: 'Issues', icon: '✓' },
  { id: 'solutions', label: 'Solutions', icon: '◈' },
  { id: 'history', label: 'History', icon: '↺' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function severityClass(severity: Severity): string {
  return `pill pill-${severity}`;
}

function severityIcon(severity: Severity): string {
  return { error: '!', warning: '~', verify: '?', info: 'i' }[severity];
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function Status({ status }: { status: StatusMessage | null }) {
  if (!status) return null;
  return (
    <div className={`status status-${status.kind}`} role="status" aria-live="polite">
      <span aria-hidden="true">{status.kind === 'error' ? '!' : status.kind === 'success' ? '✓' : 'i'}</span>
      {status.text}
    </div>
  );
}

function ScoreRing({ value, label }: { value: number | null; label: string }) {
  const display = value ?? 0;
  const color = value === null ? 'var(--muted)' : value >= 90 ? 'var(--good)' : value >= 70 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div className="score-ring" style={{ '--score': `${display * 3.6}deg`, '--score-color': color } as React.CSSProperties}>
      <div className="score-ring-inner">
        <strong>{value ?? '—'}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint ? <span className="toggle-hint">{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function App() {
  const [client, setClient] = useState<DesignerClient | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings>(() => loadSettings());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [reviewed, setReviewed] = useState<string[]>(() => loadReviewed());
  const [view, setView] = useState<View>('dashboard');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [solutionFilter, setSolutionFilter] = useState<SolutionFilter>('all');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordHistory = useCallback(
    (next: ScanResult) => {
      if (!settings.saveHistory) return;
      const entry: HistoryEntry = {
        id: `${next.snapshot.pageId}-${next.snapshot.scannedAt}`,
        pageId: next.snapshot.pageId,
        pageName: next.snapshot.pageName,
        scannedAt: next.snapshot.scannedAt,
        score: calculateScore(next.issues, next.context.solutions.length > 0),
        issueCount: next.issues.length,
        solutionKeys: next.context.solutions.map((solution) => solution.key),
      };
      setHistory(appendHistory(entry));
    },
    [settings.saveHistory]
  );

  const performScan = useCallback(
    async (activeClient?: DesignerClient) => {
      const target = activeClient ?? client;
      if (!target) {
        setError('Webflow Designer API is unavailable. Open the extension inside the Designer.');
        return;
      }

      setScanning(true);
      setError(null);
      setStatus({ kind: 'info', text: 'Checking this page…' });
      try {
        const snapshot = await scanDesigner(target);
        const next = runRules(snapshot);
        setResult(next);
        recordHistory(next);
        const count = next.context.solutions.length;
        setStatus({
          kind: 'success',
          text: count > 0 ? `All done — ${next.issues.length} thing${next.issues.length === 1 ? '' : 's'} to look at.` : 'All done — no v2 setup found here yet.',
        });
      } catch (scanError) {
        const message = scanError instanceof Error ? scanError.message : String(scanError);
        setError(message);
        setStatus({ kind: 'error', text: 'Scan failed.' });
      } finally {
        setScanning(false);
      }
    },
    [client, recordHistory]
  );

  useEffect(() => {
    try {
      const webflowClient = createWebflowDesignerClient();
      setClient(webflowClient);
      void webflowClient.setExtensionSize({ width: 460, height: 700 }).catch(() => undefined);
      void performScan(webflowClient);
    } catch (initError) {
      setError(initError instanceof Error ? initError.message : String(initError));
    }
    // Run once on mount; scans are explicitly managed after that.
  }, []);

  useEffect(() => {
    if (!client || !settings.autoScanOnPageChange) return;
    return client.subscribe('currentpage', () => {
      void performScan(client);
    });
  }, [client, settings.autoScanOnPageChange, performScan]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const score = useMemo(
    () => calculateScore(result?.issues ?? [], Boolean(result && result.context.solutions.length > 0)),
    [result]
  );

  const visibleIssues = useMemo(() => {
    if (!result) return [];
    const needle = search.trim().toLowerCase();
    return result.issues.filter((issue) => {
      if (!settings.includeVerifyIssues && issue.severity === 'verify') return false;
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
      if (solutionFilter !== 'all' && issue.solution !== solutionFilter) return false;
      if (!needle) return true;
      const haystack = [
        issue.title,
        issue.explanation,
        issue.whyItMatters,
        issue.ruleId,
        ...issue.evidence.map((item) => `${item.label} ${item.detail}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [result, settings.includeVerifyIssues, severityFilter, solutionFilter, search]);

  const selectedIssue = result?.issues.find((issue) => issue.id === selectedIssueId) ?? null;

  const updateSetting = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleLocate = async (issue: Issue) => {
    if (!client || issue.elementIds.length === 0) return;
    const element = result?.snapshot.byId.get(issue.elementIds[0]);
    if (!element) return;
    try {
      await client.setSelectedElement(element.raw as ElementRef);
      setStatus({ kind: 'success', text: `Selected ${result?.snapshot.byId.get(issue.elementIds[0])?.displayName ?? 'element'} on the canvas.` });
    } catch (locateError) {
      setStatus({ kind: 'error', text: locateError instanceof Error ? locateError.message : 'Could not select element.' });
    }
  };

  const handleFix = async (issue: Issue) => {
    if (!client || !result || !issue.fix || fixing) return;
    setFixing(true);
    setStatus({ kind: 'info', text: `Applying fix: ${issue.fix.title}…` });

    const rescan = async () => {
      const snapshot = await scanDesigner(client);
      const next = runRules(snapshot);
      setResult(next);
      recordHistory(next);
      return snapshot;
    };

    try {
      const outcome = await applyFix(client, result.snapshot, issue.fix, rescan);
      setStatus({ kind: outcome.ok ? 'success' : 'error', text: outcome.message });
      if (outcome.ok) setSelectedIssueId(null);
    } finally {
      setFixing(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: 'success', text: 'Copied to clipboard.' });
    } catch {
      setStatus({ kind: 'error', text: 'Clipboard is unavailable. Select and copy the text manually.' });
    }
  };

  const handleMarkReviewed = (issue: Issue) => {
    const next = reviewed.includes(issue.id) ? reviewed.filter((id) => id !== issue.id) : [...reviewed, issue.id];
    setReviewed(next);
    saveReviewed(next);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setStatus({ kind: 'success', text: 'History cleared.' });
  };

  const handleResize = async (size: ExtensionSize, label: string) => {
    if (!client) {
      setStatus({ kind: 'error', text: 'Panel resize is only available inside Webflow.' });
      return;
    }
    try {
      await client.setExtensionSize(size);
      setStatus({ kind: 'success', text: `Panel opened at ${label}.` });
    } catch {
      setStatus({ kind: 'error', text: 'Webflow could not resize the panel.' });
    }
  };

  const hasMarkers = Boolean(result && result.context.solutions.length > 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">FS</div>
        <div className="brand-copy">
          <h1>Finsweet Attributes v2 Debugger</h1>
          <p>Independent developer tool. Not affiliated with Finsweet.</p>
        </div>
        <button className="button button-primary" onClick={() => void performScan()} disabled={scanning || !client}>
          {scanning ? 'Checking…' : 'Scan page'}
        </button>
      </header>

      <nav className="tabs" aria-label="Main views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            className={`tab ${view === item.id ? 'tab-active' : ''}`}
            onClick={() => {
              setView(item.id);
              setSelectedIssueId(null);
            }}
            aria-current={view === item.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
            {item.id === 'issues' && result ? <span className="tab-count">{result.issues.length}</span> : null}
          </button>
        ))}
      </nav>

      <Status status={status} />

      {error ? (
        <div className="notice notice-error" role="alert">
          <strong>Couldn’t reach Webflow</strong>
          <p>{error}</p>
          <button className="button button-primary" onClick={() => void performScan()}>Try again</button>
        </div>
      ) : null}

      <main className="app-main">
        {view === 'dashboard' ? (
          <Dashboard
            result={result}
            score={score}
            scanning={scanning}
            onScan={() => void performScan()}
            onOpenIssues={() => setView('issues')}
            onOpenSolutions={() => setView('solutions')}
          />
        ) : null}

        {view === 'issues' && !selectedIssue ? (
          <IssuesView
            issues={visibleIssues}
            total={result?.issues.length ?? 0}
            severityFilter={severityFilter}
            solutionFilter={solutionFilter}
            search={search}
            onSeverityChange={setSeverityFilter}
            onSolutionChange={setSolutionFilter}
            onSearchChange={setSearch}
            onSelect={setSelectedIssueId}
            reviewed={reviewed}
          />
        ) : null}

        {view === 'issues' && selectedIssue ? (
          <IssueDetail
            issue={selectedIssue}
            fixing={fixing}
            reviewed={reviewed.includes(selectedIssue.id)}
            onBack={() => setSelectedIssueId(null)}
            onLocate={() => void handleLocate(selectedIssue)}
            onFix={() => void handleFix(selectedIssue)}
            onCopy={handleCopy}
            onReviewed={() => handleMarkReviewed(selectedIssue)}
          />
        ) : null}

        {view === 'solutions' ? (
          <SolutionsView result={result} onCopy={handleCopy} onOpenIssues={() => setView('issues')} />
        ) : null}

        {view === 'history' ? (
          <HistoryView history={history} onClear={handleClearHistory} />
        ) : null}

        {view === 'settings' ? (
          <SettingsView
            settings={settings}
            onSetting={updateSetting}
            onResize={handleResize}
            onClearHistory={handleClearHistory}
          />
        ) : null}
      </main>

      <footer className="app-footer">
        <span>{result ? `${result.snapshot.pageName} · ${formatTime(result.snapshot.scannedAt)}` : 'Not connected'}</span>
        <span>{hasMarkers ? 'v2 markers detected' : 'v2 scan idle or no markers'}</span>
      </footer>
    </div>
  );
}

interface DashboardProps {
  result: ScanResult | null;
  score: ReturnType<typeof calculateScore>;
  scanning: boolean;
  onScan: () => void;
  onOpenIssues: () => void;
  onOpenSolutions: () => void;
}

function Dashboard({ result, score, scanning, onScan, onOpenIssues, onOpenSolutions }: DashboardProps) {
  const solutions = result?.context.solutions ?? [];
  const hasMarkers = solutions.length > 0;

  return (
    <div className="view-stack">
      <section className="panel score-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Let’s take a look</span>
            <h2>{result?.snapshot.pageName ?? 'Waiting for Webflow'}</h2>
            <p className="panel-subtitle">We check the page you’re designing — nothing else.</p>
          </div>
          <span className={`badge ${hasMarkers ? 'badge-live' : ''}`}>{hasMarkers ? 'v2 found' : 'No v2 yet'}</span>
        </div>

        <div className="score-row">
          <ScoreRing value={score.value} label={score.label} />
          <div className="score-copy">
            <p className="score-headline">{score.summary}</p>
            {!hasMarkers ? (
              <p className="muted small">This page doesn’t use v2 attributes yet. That’s totally fine — open a page that does and scan again.</p>
            ) : null}
            <div className="severity-grid">
              <div><strong className="text-bad">{score.counts.error}</strong><span>To fix</span></div>
              <div><strong className="text-warn">{score.counts.warning}</strong><span>Check</span></div>
              <div><strong>{score.counts.verify}</strong><span>Verify</span></div>
              <div><strong className="text-good">{score.counts.info}</strong><span>Tips</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>What we found</h2>
            <p className="panel-subtitle">Solutions detected from v2 attributes on this page.</p>
          </div>
          <button className="link-button" onClick={onOpenSolutions}>Details →</button>
        </div>
        {solutions.length === 0 ? (
          <EmptyState
            title="No v2 setup here yet"
            body="Add a Finsweet v2 attribute to this page, then scan again. Legacy fs-cms* attributes are ignored on purpose."
          />
        ) : (
          <div className="chip-grid">
            {solutions.map((solution) => (
              <div className="solution-chip" key={solution.key}>
                <span>{solutionLabel(solution.key)}</span>
                <small>{solution.instances.length} instance{solution.instances.length === 1 ? '' : 's'}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel quick-actions">
        <button className="button button-primary" onClick={onScan} disabled={scanning || !result}>{scanning ? 'Checking…' : 'Check again'}</button>
        <button className="button" onClick={onOpenIssues} disabled={!result}>See what to fix</button>
      </section>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">✦</div>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

interface IssuesViewProps {
  issues: Issue[];
  total: number;
  severityFilter: SeverityFilter;
  solutionFilter: SolutionFilter;
  search: string;
  onSeverityChange: (value: SeverityFilter) => void;
  onSolutionChange: (value: SolutionFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  reviewed: string[];
}

function IssuesView({
  issues,
  total,
  severityFilter,
  solutionFilter,
  search,
  onSeverityChange,
  onSolutionChange,
  onSearchChange,
  onSelect,
  reviewed,
}: IssuesViewProps) {
  return (
    <div className="view-stack">
      <section className="panel filters-panel">
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            value={search}
            placeholder="Title, attribute, element…"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <div className="filter-row">
          <label className="field field-small">
            <span>Severity</span>
            <select value={severityFilter} onChange={(event) => onSeverityChange(event.target.value as SeverityFilter)}>
              <option value="all">All</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="verify">Verify</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label className="field field-small">
            <span>Solution</span>
            <select value={solutionFilter} onChange={(event) => onSolutionChange(event.target.value as SolutionFilter)}>
              <option value="all">All</option>
              {(['global', 'filter', 'sort', 'load', 'slider', 'select', 'tabs', 'nest', 'combine', 'inject'] as SolutionKey[]).map((key) => (
                <option key={key} value={key}>{solutionLabel(key)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="list-meta">{issues.length} of {total} shown</div>

      {issues.length === 0 ? (
        <EmptyState title="Nothing here to worry about" body="Try another filter, or scan again after you make a change." />
      ) : (
        <div className="issue-list">
          {issues.map((issue) => (
            <button className="issue-card" key={issue.id} onClick={() => onSelect(issue.id)}>
              <div className="issue-card-top">
                <span className={severityClass(issue.severity)}><span aria-hidden="true">{severityIcon(issue.severity)}</span> {issue.severity}</span>
                <span className="issue-rule">{issue.ruleId}</span>
                {reviewed.includes(issue.id) ? <span className="reviewed-mark">Reviewed</span> : null}
              </div>
              <strong>{issue.title}</strong>
              <p>{issue.explanation}</p>
              <div className="issue-card-bottom">
                <span>{solutionLabel(issue.solution)}</span>
                <span aria-hidden="true">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface IssueDetailProps {
  issue: Issue;
  fixing: boolean;
  reviewed: boolean;
  onBack: () => void;
  onLocate: () => void;
  onFix: () => void;
  onCopy: (text: string) => void;
  onReviewed: () => void;
}

function IssueDetail({ issue, fixing, reviewed, onBack, onLocate, onFix, onCopy, onReviewed }: IssueDetailProps) {
  return (
    <div className="view-stack">
      <button className="back-button" onClick={onBack}>← All issues</button>
      <section className="panel detail-panel">
        <div className="issue-card-top">
          <span className={severityClass(issue.severity)}><span aria-hidden="true">{severityIcon(issue.severity)}</span> {issue.severity}</span>
          <span className="confidence">{issue.confidence.replace('-', ' ')}</span>
          <span className="issue-rule">{issue.ruleId}</span>
        </div>
        <h2>{issue.title}</h2>
        <p className="detail-copy">{issue.explanation}</p>

        <h3>Why it matters</h3>
        <p className="detail-copy muted">{issue.whyItMatters}</p>

        {issue.breadcrumb.length > 0 ? (
          <>
            <h3>Location</h3>
            <div className="breadcrumb">
              {issue.breadcrumb.map((part, index) => (
                <span key={`${part}-${index}`}>{part}</span>
              ))}
            </div>
          </>
        ) : null}

        {issue.evidence.length > 0 ? (
          <>
            <h3>Evidence</h3>
            <div className="evidence-list">
              {issue.evidence.map((item, index) => (
                <div className="evidence-row" key={`${item.label}-${index}`}>
                  <span>{item.label}</span>
                  <code>{item.detail}</code>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {issue.manualSteps && issue.manualSteps.length > 0 ? (
          <>
            <h3>Manual steps</h3>
            <ol className="manual-steps">
              {issue.manualSteps.map((step, index) => (
                <li key={`${step}-${index}`}>
                  <span>{step}</span>
                  {step.startsWith('<script') ? (
                    <button className="icon-button" aria-label="Copy script snippet" onClick={() => void onCopy(step)}>Copy</button>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        ) : null}

        <div className="detail-actions">
          <button className="button" onClick={onLocate} disabled={issue.elementIds.length === 0}>Find on canvas</button>
          <button className="button button-primary" onClick={onFix} disabled={!issue.fix || fixing}>
            {fixing ? 'Fixing…' : issue.fix ? 'Fix it for me' : 'Manual fix only'}
          </button>
          <button className="button button-ghost" onClick={onReviewed}>{reviewed ? 'Need another look' : 'I’ll handle this'}</button>
        </div>

        {issue.fix ? (
          <div className="fix-preview">
            <strong>Fix preview</strong>
            <p>{issue.fix.description}</p>
            <ul>
              {issue.fix.operations.map((operation, index) => (
                <li key={`${operation.name}-${index}`}>
                  <code>{operation.kind === 'set' ? `SET ${operation.name}="${operation.value}"` : `REMOVE ${operation.name}`}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <a className="docs-link" href={issue.docsUrl} target="_blank" rel="noreferrer">Open official documentation ↗</a>
      </section>
    </div>
  );
}

function SolutionsView({
  result,
  onCopy,
  onOpenIssues,
}: {
  result: ScanResult | null;
  onCopy: (text: string) => void;
  onOpenIssues: () => void;
}) {
  const solutions = result?.context.solutions ?? [];

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="panel-heading">
          <h2>Detected solutions</h2>
          <button className="link-button" onClick={onOpenIssues}>See issues →</button>
        </div>
        {solutions.length === 0 ? (
          <EmptyState title="Nothing detected yet" body="Run a scan on a page that uses Finsweet Attributes v2." />
        ) : (
          <div className="solution-list">
            {solutions.map((solution) => (
              <div className="solution-card" key={solution.key}>
                <div className="solution-card-head">
                  <strong>{solutionLabel(solution.key)}</strong>
                  <span>{solution.evidenceIds.length} element{solution.evidenceIds.length === 1 ? '' : 's'}</span>
                </div>
                <p>Instances: {solution.instances.join(', ')}</p>
                <a href={DOCS[solution.key]} target="_blank" rel="noreferrer">Official docs ↗</a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Universal script snippets</h2>
        <p className="muted small">Custom code is not always readable through Designer APIs. Verify these in page settings.</p>
        <div className="code-block">
          <div className="code-head">
            <span>List solutions</span>
            <button className="icon-button" onClick={() => void onCopy(LIST_SCRIPT_SNIPPET)}>Copy</button>
          </div>
          <code>{LIST_SCRIPT_SNIPPET}</code>
        </div>
        <div className="code-block">
          <div className="code-head">
            <span>Inject</span>
            <button className="icon-button" onClick={() => void onCopy(INJECT_SCRIPT_SNIPPET)}>Copy</button>
          </div>
          <code>{INJECT_SCRIPT_SNIPPET}</code>
        </div>
      </section>
    </div>
  );
}

function HistoryView({ history, onClear }: { history: HistoryEntry[]; onClear: () => void }) {
  return (
    <div className="view-stack">
      <section className="panel">
        <div className="panel-heading">
          <h2>Scan history</h2>
          <button className="button button-ghost" onClick={onClear} disabled={history.length === 0}>Clear</button>
        </div>
        {history.length === 0 ? (
          <EmptyState title="No history" body="Scans for this browser session will appear here." />
        ) : (
          <div className="history-list">
            {history.map((entry) => (
              <div className="history-row" key={entry.id}>
                <div>
                  <strong>{entry.pageName}</strong>
                  <span>{formatTime(entry.scannedAt)} · {entry.issueCount} issues</span>
                </div>
                <div className="history-score">
                  <strong>{entry.score.value ?? '—'}</strong>
                  <span>{entry.solutionKeys.length} solution{entry.solutionKeys.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({
  settings,
  onSetting,
  onResize,
  onClearHistory,
}: {
  settings: ExtensionSettings;
  onSetting: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  onResize: (size: ExtensionSize, label: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="view-stack">
      <section className="panel">
        <h2>Scan behavior</h2>
        <Toggle
          checked={settings.autoScanOnPageChange}
          onChange={(value) => onSetting('autoScanOnPageChange', value)}
          label="Auto-scan on page change"
          hint="Rescan when the current Designer page changes."
        />
        <Toggle
          checked={settings.includeVerifyIssues}
          onChange={(value) => onSetting('includeVerifyIssues', value)}
          label="Include verification items"
          hint="Show checks that cannot be completed with Designer APIs alone."
        />
        <Toggle
          checked={settings.strictEnums}
          onChange={(value) => onSetting('strictEnums', value)}
          label="Strict enum validation"
          hint="Reserved for future expanded value checks."
        />
        <Toggle
          checked={settings.saveHistory}
          onChange={(value) => onSetting('saveHistory', value)}
          label="Save local history"
          hint="History stays in extension local storage. No backend is used."
        />
      </section>

      <section className="panel">
        <h2>Panel size</h2>
        <p className="muted small">The panel opens at a spacious 460 × 700 by default. Pick what feels best.</p>
        <div className="button-row">
          <button className="button" onClick={() => onResize({ width: 340, height: 560 }, 'compact 340 × 560')}>Compact</button>
          <button className="button" onClick={() => onResize({ width: 400, height: 640 }, 'comfortable 400 × 640')}>Comfortable</button>
          <button className="button button-primary" onClick={() => onResize({ width: 460, height: 700 }, 'spacious 460 × 700')}>Spacious</button>
        </div>
      </section>

      <section className="panel">
        <h2>Data</h2>
        <button className="button button-ghost" onClick={onClearHistory}>Clear scan history</button>
      </section>
    </div>
  );
}
