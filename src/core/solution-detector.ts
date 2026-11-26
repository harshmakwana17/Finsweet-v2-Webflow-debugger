import { DOCS } from './constants';
import type { DetectedSolution, RuleContext, SolutionKey } from './types';

const ELEMENT_VALUE_TO_SOLUTION: Record<string, SolutionKey> = {
  filters: 'filter',
  'sort-trigger': 'sort',
  slider: 'slider',
  select: 'select',
  'select-value': 'select',
  tabs: 'tabs',
  'tab-link': 'tabs',
  'nest-target': 'nest',
};

export function detectSolutions(context: RuleContext): DetectedSolution[] {
  const { snapshot, helpers } = context;
  const found = new Map<SolutionKey, { evidence: Set<string>; instances: Set<string> }>();

  const add = (key: SolutionKey, elementId: string, instance: string) => {
    const entry = found.get(key) ?? { evidence: new Set<string>(), instances: new Set<string>() };
    entry.evidence.add(elementId);
    entry.instances.add(instance);
    found.set(key, entry);
  };

  for (const element of snapshot.elements) {
    const namespace = element.attributes.some((attribute) => attribute.name.startsWith('fs-inject-'))
      ? 'fs-inject'
      : 'fs-list';
    const instance = helpers.instanceOf(element, namespace);
    const elementRole = helpers.attrValue(element, 'fs-list-element');

    if (elementRole && ELEMENT_VALUE_TO_SOLUTION[elementRole]) {
      add(ELEMENT_VALUE_TO_SOLUTION[elementRole], element.id, instance);
    }
    if (helpers.attr(element, 'fs-list-load')) add('load', element.id, instance);
    if (helpers.attr(element, 'fs-list-combine')) add('combine', element.id, instance);
    if (helpers.attr(element, 'fs-list-nest')) add('nest', element.id, instance);
    if (
      helpers.attr(element, 'fs-list-fieldtype') ||
      helpers.attr(element, 'fs-list-reverse') ||
      helpers.attr(element, 'fs-list-ascclass') ||
      helpers.attr(element, 'fs-list-descclass')
    ) {
      add('sort', element.id, instance);
    }
    if (
      element.attributes.some((attribute) =>
        attribute.name.startsWith('fs-inject-')
      )
    ) {
      add('inject', element.id, instance);
    }
  }

  return [...found.entries()].map(([key, entry]) => ({
    key,
    evidenceIds: [...entry.evidence],
    instances: [...entry.instances],
  }));
}

export function solutionLabel(key: SolutionKey): string {
  const labels: Record<SolutionKey, string> = {
    global: 'Global script',
    filter: 'List Filter',
    sort: 'List Sort',
    load: 'List Load',
    slider: 'List Slider',
    select: 'List Select',
    tabs: 'List Tabs',
    nest: 'List Nest',
    combine: 'List Combine',
    inject: 'Inject',
  };
  return labels[key];
}

export function solutionDocs(key: SolutionKey): string {
  return DOCS[key];
}
