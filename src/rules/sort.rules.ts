import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue, setFix } from './rule-utils';
import type { Rule, RuleContext } from '../core/types';

const FIELD_TYPES = new Set(['date', 'number']);

function sortMarkers(context: RuleContext) {
  return context.snapshot.elements.filter((element) =>
    [
      'fs-list-fieldtype',
      'fs-list-reverse',
      'fs-list-ascclass',
      'fs-list-descclass',
      'fs-list-sortingclass',
    ].some((name) => Boolean(context.helpers.attrValue(element, name)))
  );
}

function has(context: RuleContext, key: 'sort'): boolean {
  return context.solutions.some((solution) => solution.key === key);
}

export const sortRules: Rule[] = [
  {
    id: 'SORT-001',
    solution: 'sort',
    title: 'Sort setup requires a marked list',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.sort,
    detect(context) {
      if (!has(context, 'sort')) return [];
      const triggers = context.helpers.byAttr('fs-list-element', 'sort-trigger');
      if (triggers.length === 0) return [];
      if (context.helpers.byAttr('fs-list-element', 'list').length > 0) return [];

      return triggers.map((element) =>
        makeIssue({
          ruleId: 'SORT-001',
          solution: 'sort',
          severity: 'error',
          confidence: 'verified',
          title: 'Sort trigger has no marked list',
          explanation: `${context.helpers.label(element)} is a sort trigger, but no element is marked fs-list-element="list".`,
          whyItMatters: 'List Sort needs a target list to reorder.',
          elementIds: [element.id],
          evidence: evidenceFor(context, element.id, ['fs-list-element']),
          docsUrl: DOCS.sort,
          manualSteps: ['Add fs-list-element="list" to the Collection List Wrapper or Collection List.'],
        })
      );
    },
  },
  {
    id: 'SORT-002',
    solution: 'sort',
    title: 'Sort trigger uses a supported element',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.sort,
    detect(context) {
      if (!has(context, 'sort')) return [];
      return context.helpers
        .byAttr('fs-list-element', 'sort-trigger')
        .filter((element) => !context.helpers.isLinkLike(element) && !context.helpers.isSelect(element))
        .map((element) =>
          makeIssue({
            ruleId: 'SORT-002',
            solution: 'sort',
            severity: 'error',
            confidence: 'verified',
            title: 'Sort trigger is on an unsupported element',
            explanation: `${context.helpers.label(element)} is marked as a sort trigger but is not a Select, Dropdown link, Button, Text Link, or Link Block.`,
            whyItMatters: 'Finsweet Sort supports specific trigger element types.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-element']),
            docsUrl: DOCS.sort,
            manualSteps: ['Move fs-list-element="sort-trigger" to a supported trigger element.'],
          })
        );
    },
  },
  {
    id: 'SORT-003',
    solution: 'sort',
    title: 'Sort trigger can be inferred safely',
    severity: 'warning',
    confidence: 'partial',
    docsUrl: DOCS.sort,
    detect(context) {
      if (!has(context, 'sort')) return [];
      if (context.helpers.byAttr('fs-list-element', 'sort-trigger').length > 0) return [];
      const markers = sortMarkers(context);
      if (markers.length === 0) return [];

      const candidates = context.snapshot.elements.filter(
        (element) => context.helpers.isSelect(element) || context.helpers.isLinkLike(element)
      );
      if (candidates.length !== 1) return [];

      const candidate = candidates[0];
      return [
        makeIssue({
          ruleId: 'SORT-003',
          solution: 'sort',
          severity: 'warning',
          confidence: 'partial',
          title: 'Add the sort trigger role',
          explanation: `Sort-specific attributes exist, and ${context.helpers.label(candidate)} is the only supported trigger candidate.`,
          whyItMatters: 'A sort trigger is required so users can change the active sort.',
          elementIds: [candidate.id],
          evidence: markers.flatMap((element) => evidenceFor(context, element.id, ['fs-list-fieldtype', 'fs-list-reverse'])),
          docsUrl: DOCS.sort,
          fix: setFix(
            `SORT-003:${candidate.id}`,
            'Add sort-trigger role',
            'Add the verified sort trigger role to the only supported candidate.',
            [{ kind: 'set', elementId: candidate.id, name: 'fs-list-element', value: 'sort-trigger' }]
          ),
        }),
      ];
    },
  },
  {
    id: 'SORT-004',
    solution: 'sort',
    title: 'Sort field identifiers use documented direction syntax',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.sort,
    detect(context) {
      if (!has(context, 'sort')) return [];
      const issues = [];

      for (const element of context.snapshot.elements) {
        const field = context.helpers.attrValue(element, 'fs-list-field');
        if (!field) continue;

        const sortTrigger = context.helpers.ancestor(
          element,
          (candidate) => context.helpers.attrValue(candidate, 'fs-list-element') === 'sort-trigger'
        );
        if (!sortTrigger && context.helpers.attrValue(element, 'fs-list-element') !== 'sort-trigger') continue;

        const isAscDesc = /-asc$|-desc$/.test(field);
        if (!isAscDesc && !context.helpers.isLinkLike(element) && !context.helpers.isSelect(element)) continue;

        if (!isAscDesc) {
          issues.push(
            makeIssue({
              ruleId: 'SORT-004',
              solution: 'sort',
              severity: 'warning',
              confidence: 'verified',
              title: `Sort field "${field}" has no direction suffix`,
              explanation: 'Dropdown sort links use fs-list-field="IDENTIFIER-asc" or "IDENTIFIER-desc".',
              whyItMatters: 'The direction suffix tells List Sort which order to apply.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-field']),
              docsUrl: DOCS.sort,
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'SORT-005',
    solution: 'sort',
    title: 'Documented sort option values',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.sort,
    detect(context) {
      if (!has(context, 'sort')) return [];
      const issues = [];

      for (const element of context.snapshot.elements) {
        const fieldType = context.helpers.attrValue(element, 'fs-list-fieldtype');
        if (fieldType && !FIELD_TYPES.has(fieldType)) {
          issues.push(
            makeIssue({
              ruleId: 'SORT-005',
              solution: 'sort',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-fieldtype value "${fieldType}"`,
              explanation: 'Allowed values are date and number.',
              whyItMatters: 'Sorting dates and numbers requires the correct field type.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-fieldtype']),
              docsUrl: DOCS.sort,
            })
          );
        }

        const reverse = context.helpers.attrValue(element, 'fs-list-reverse');
        if (reverse && !['true', 'false'].includes(reverse)) {
          issues.push(
            makeIssue({
              ruleId: 'SORT-005',
              solution: 'sort',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-reverse value "${reverse}"`,
              explanation: 'Use true or false.',
              whyItMatters: 'Boolean attribute values must be explicit.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-reverse']),
              docsUrl: DOCS.sort,
            })
          );
        }
      }

      return issues;
    },
  },
];
