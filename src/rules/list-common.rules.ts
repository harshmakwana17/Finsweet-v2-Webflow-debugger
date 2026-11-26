import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue, setFix } from './rule-utils';
import type { Rule, RuleContext } from '../core/types';

const LIST_ROLES = new Set([
  'list',
  'filters',
  'sort-trigger',
  'slider',
  'select',
  'select-value',
  'tabs',
  'tab-link',
  'nest-target',
  'wrapper',
]);

export const listCommonRules: Rule[] = [
  {
    id: 'LIST-001',
    solution: 'global',
    title: 'List role uses a supported host',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.staticLists,
    detect(context) {
      const issues = [];
      for (const element of context.snapshot.elements) {
        const role = context.helpers.attrValue(element, 'fs-list-element');
        if (role !== 'list') continue;
        if (context.helpers.isCmsListHost(element) || context.helpers.isStaticListHost(element)) continue;
        issues.push(
          makeIssue({
            ruleId: 'LIST-001',
            solution: 'global',
            severity: 'error',
            confidence: 'verified',
            title: 'fs-list-element="list" is on an unsupported element',
            explanation: `The element ${context.helpers.label(element)} has the list role but is not a Collection List or a supported static-list host.`,
            whyItMatters: 'Finsweet list solutions expect the list role on a Collection List or the documented non-CMS wrapper structure.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-element']),
            docsUrl: DOCS.staticLists,
          })
        );
      }
      return issues;
    },
  },
  {
    id: 'LIST-002',
    solution: 'global',
    title: 'Static list structure',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.staticLists,
    detect(context) {
      const issues = [];
      for (const list of context.helpers.byAttr('fs-list-element', 'list')) {
        if (context.helpers.isCmsListHost(list)) continue;
        const descendants = context.helpers.descendants(list);
        if (!descendants.some((element) => context.helpers.attrValue(element, 'fs-list-element') === 'item')) {
          issues.push(
            makeIssue({
              ruleId: 'LIST-002',
              solution: 'global',
              severity: 'warning',
              confidence: 'verified',
              title: 'Static list has no element marked as an item',
            explanation: `The static list ${context.helpers.label(list)} needs the wrapper → list → item structure documented for non-CMS lists.`,
              whyItMatters: 'Finsweet needs to know which repeated element represents each list item.',
              elementIds: [list.id],
              evidence: evidenceFor(context, list.id, ['fs-list-element']),
              docsUrl: DOCS.staticLists,
              manualSteps: ['Add fs-list-element="item" to the repeated item element.'],
            })
          );
        }
      }
      return issues;
    },
  },
  {
    id: 'LIST-003',
    solution: 'global',
    title: 'Multiple instances are scoped',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.instances,
    detect(context) {
      const issues = [];
      const lists = context.helpers.byAttr('fs-list-element', 'list');
      const grouped = new Map<string, typeof lists>();
      for (const list of lists) {
        const scope = context.helpers.instanceOf(list);
        grouped.set(scope, [...(grouped.get(scope) ?? []), list]);
      }

      for (const [scope, scopedLists] of grouped) {
        if (scope === '__root__' || scopedLists.length < 2) continue;
        issues.push(
          makeIssue({
            ruleId: 'LIST-003',
            solution: 'global',
            severity: 'warning',
            confidence: 'verified',
            title: `Multiple list solutions share instance "${scope}"`,
            explanation: `${scopedLists.length} lists are using the same instance identifier.`,
            whyItMatters: 'Distinct Finsweet instances need distinct fs-list-instance values so their elements do not interfere.',
            elementIds: scopedLists.map((element) => element.id),
            evidence: scopedLists.flatMap((element) => evidenceFor(context, element.id, ['fs-list-instance'])),
            docsUrl: DOCS.instances,
            manualSteps: ['Give each independent list and its related controls a unique fs-list-instance value.'],
          })
        );
      }
      return issues;
    },
  },
  {
    id: 'LIST-004',
    solution: 'global',
    title: 'Unrecognized fs-list roles',
    severity: 'warning',
    confidence: 'partial',
    docsUrl: DOCS.filter,
    detect(context) {
      const issues = [];
      for (const element of context.snapshot.elements) {
        const role = context.helpers.attrValue(element, 'fs-list-element');
        if (!role || LIST_ROLES.has(role) || role.startsWith('pagination-') || role === 'empty') continue;
        issues.push(
          makeIssue({
            ruleId: 'LIST-004',
            solution: 'global',
            severity: 'warning',
            confidence: 'partial',
            title: `Unrecognized fs-list-element value "${role}"`,
            explanation: `The role "${role}" on ${context.helpers.label(element)} is not in the verified v2 role inventory used by this extension.`,
            whyItMatters: 'Misspelled role values silently prevent Finsweet solutions from initializing.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-element']),
            docsUrl: DOCS.filter,
            manualSteps: ['Compare this value with the official solution flash card and correct any typo.'],
          })
        );
      }
      return issues;
    },
  },
];

export function createListRoleFix(
  context: RuleContext,
  candidateIds: string[],
  role: string,
  ruleId: string
) {
  if (candidateIds.length !== 1) return undefined;
  const element = context.snapshot.byId.get(candidateIds[0]);
  if (!element) return undefined;
  if (context.helpers.attrValue(element, 'fs-list-element') === role) return undefined;

  return setFix(
    `${ruleId}:add-${role}`,
    `Add fs-list-element="${role}"`,
    `Add the verified ${role} role to ${context.helpers.label(element)}.`,
    [{ kind: 'set', elementId: element.id, name: 'fs-list-element', value: role }]
  );
}
