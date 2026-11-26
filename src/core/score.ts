import type { HealthScore, Issue, Severity } from './types';

const DEDUCTIONS: Record<Severity, number> = {
  error: 12,
  warning: 4,
  verify: 0,
  info: 0,
};

function countsFor(issues: Issue[]): Record<Severity, number> {
  return issues.reduce(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    { error: 0, warning: 0, verify: 0, info: 0 } as Record<Severity, number>
  );
}

export function calculateScore(issues: Issue[], hasV2Markers: boolean): HealthScore {
  const counts = countsFor(issues);

  if (!hasV2Markers) {
    return {
      value: null,
      label: 'Not applicable',
      summary: 'No Finsweet Attributes v2 markers were detected on this page.',
      counts,
    };
  }

  const effectiveIssues = issues.filter(
    (issue) => issue.confidence === 'verified' || (issue.confidence === 'partial' && issue.severity !== 'verify')
  );
  const deduction = effectiveIssues.reduce((total, issue) => total + DEDUCTIONS[issue.severity], 0);
  const value = Math.max(0, 100 - deduction);

  return {
    value,
    label: value >= 90 ? 'Healthy' : value >= 70 ? 'Needs attention' : 'Needs fixes',
    summary: `${value} — ${counts.error} error${counts.error === 1 ? '' : 's'}, ${counts.warning} warning${counts.warning === 1 ? '' : 's'}${counts.verify > 0 ? `, ${counts.verify} to verify` : ''}.`,
    counts,
  };
}
