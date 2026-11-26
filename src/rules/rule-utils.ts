import type {
  FixOperation,
  FixPlan,
  Issue,
  IssueEvidence,
  RuleContext,
  Severity,
  Confidence,
  SolutionKey,
} from '../core/types';

export interface IssueInput {
  ruleId: string;
  solution: SolutionKey;
  severity: Severity;
  confidence: Confidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  elementIds?: string[];
  evidence?: IssueEvidence[];
  docsUrl: string;
  fix?: FixPlan;
  manualSteps?: string[];
}

export function makeIssue(input: IssueInput): Issue {
  const elementPart = (input.elementIds ?? []).join('-') || 'page';
  return {
    id: `${input.ruleId}:${elementPart}`,
    ruleId: input.ruleId,
    solution: input.solution,
    severity: input.severity,
    confidence: input.confidence,
    title: input.title,
    explanation: input.explanation,
    whyItMatters: input.whyItMatters,
    evidence: input.evidence ?? [],
    elementIds: input.elementIds ?? [],
    breadcrumb: [],
    docsUrl: input.docsUrl,
    fix: input.fix,
    manualSteps: input.manualSteps,
  };
}

export function evidenceFor(
  context: RuleContext,
  elementId: string,
  names: string[]
): IssueEvidence[] {
  const element = context.snapshot.byId.get(elementId);
  if (!element) return [];
  return names.map((name) => {
    const attribute = context.helpers.attr(element, name);
    const detail = !attribute
      ? 'not set'
      : attribute.value === null
        ? attribute.bound
          ? 'bound / unresolved at design time'
          : 'empty'
        : `"${attribute.value}"`;
    return { label: `${context.helpers.label(element)} · ${name}`, detail };
  });
}

export function setFix(
  id: string,
  title: string,
  description: string,
  operations: FixOperation[],
  preconditions: FixPlan['preconditions'] = []
): FixPlan {
  return { id, title, description, operations, preconditions };
}

export function elementStillExists(elementId: string): (snapshot: RuleContext['snapshot']) => boolean {
  return (snapshot) => snapshot.byId.has(elementId);
}

export function attrStillEquals(
  elementId: string,
  name: string,
  value: string
): (snapshot: RuleContext['snapshot']) => boolean {
  return (snapshot) => {
    const element = snapshot.byId.get(elementId);
    return Boolean(element && contextlessValue(element, name) === value);
  };
}

export function attrMissing(
  elementId: string,
  name: string
): (snapshot: RuleContext['snapshot']) => boolean {
  return (snapshot) => {
    const element = snapshot.byId.get(elementId);
    return Boolean(element && !contextlessValue(element, name));
  };
}

function contextlessValue(
  element: { attributes: Array<{ name: string; value: string | null; bound: boolean }> },
  name: string
): string | null {
  const attribute = element.attributes.find((candidate) => candidate.name === name.toLowerCase());
  if (!attribute || attribute.bound) return null;
  return attribute.value;
}
