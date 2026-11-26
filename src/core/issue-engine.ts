import { createHelpers } from './helpers';
import { detectSolutions } from './solution-detector';
import { rules } from '../rules/registry';
import type { Issue, RuleContext, ScanSnapshot } from './types';

export interface ScanResult {
  snapshot: ScanSnapshot;
  context: RuleContext;
  issues: Issue[];
}

export function runRules(snapshot: ScanSnapshot): ScanResult {
  const context: RuleContext = {
    snapshot,
    solutions: [],
    helpers: createHelpers(snapshot),
  };
  context.solutions = detectSolutions(context);

  const issues = rules.flatMap((rule) => {
    try {
      return rule.detect(context).map((issue) => ({
        ...issue,
        breadcrumb:
          issue.breadcrumb.length > 0
            ? issue.breadcrumb
            : issue.elementIds.length > 0 && snapshot.byId.has(issue.elementIds[0])
              ? context.helpers.breadcrumb(snapshot.byId.get(issue.elementIds[0])!)
              : [],
      }));
    } catch (error) {
      return [
        {
          id: `${rule.id}:engine-error`,
          ruleId: rule.id,
          solution: rule.solution,
          severity: 'verify' as const,
          confidence: 'requires-verification' as const,
          title: `${rule.title} could not run`,
          explanation: error instanceof Error ? error.message : String(error),
          whyItMatters: 'This rule was skipped safely instead of reporting an unverified result.',
          evidence: [],
          elementIds: [],
          breadcrumb: [],
          docsUrl: rule.docsUrl,
        },
      ];
    }
  });

  return { snapshot, context, issues };
}
