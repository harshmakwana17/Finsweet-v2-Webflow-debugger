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
      summary: 'No v2 setup found on this page — nothing to score yet.',
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
    label: value >= 90 ? 'Looking good' : value >= 70 ? 'Almost there' : 'Needs a little love',
    summary: `Score ${value} · ${counts.error} to fix, ${counts.warning} to check${counts.verify > 0 ? `, ${counts.verify} to verify` : ''}.`,
    counts,
  };
}
