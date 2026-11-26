import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue, setFix } from './rule-utils';
import type { Rule, RuleContext } from '../core/types';

const LOAD_METHODS = new Set(['more', 'all', 'infinite', 'pagination']);
const ANIMATIONS = new Set(['fade', 'slide-up', 'slide-down', 'slide-right', 'slide-left', 'grow', 'shrink', 'spin']);
const EASINGS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']);

function has(context: RuleContext, key: 'load'): boolean {
  return context.solutions.some((solution) => solution.key === key);
}

function loadElements(context: RuleContext) {
  return context.helpers.byAttr('fs-list-load');
}

export const loadRules: Rule[] = [
  {
    id: 'LOAD-001',
    solution: 'load',
    title: 'List and load role share one element',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      const issues = [];

      for (const element of loadElements(context)) {
        if (context.helpers.attrValue(element, 'fs-list-element') === 'list') continue;
        const lists = context.helpers.byAttr('fs-list-element', 'list');
        const candidate = lists.length === 1 ? lists[0] : null;
        issues.push(
          makeIssue({
            ruleId: 'LOAD-001',
            solution: 'load',
            severity: 'error',
            confidence: 'verified',
            title: 'fs-list-load is not on the marked list',
            explanation: candidate
              ? `${context.helpers.label(element)} has fs-list-load, while ${context.helpers.label(candidate)} is the marked list.`
              : `${context.helpers.label(element)} has fs-list-load but is not marked as the list.`,
            whyItMatters: 'List Load expects fs-list-load on the same element as fs-list-element="list".',
            elementIds: candidate ? [element.id, candidate.id] : [element.id],
            evidence: [
              ...evidenceFor(context, element.id, ['fs-list-load', 'fs-list-element']),
              ...(candidate ? evidenceFor(context, candidate.id, ['fs-list-element', 'fs-list-load']) : []),
            ],
            docsUrl: DOCS.load,
            fix: candidate
              ? setFix(
                  `LOAD-001:${element.id}`,
                  'Move load role to list',
                  'Remove fs-list-load from its current element and add it to the marked list.',
                  [
                    { kind: 'remove', elementId: element.id, name: 'fs-list-load' },
                    { kind: 'set', elementId: candidate.id, name: 'fs-list-load', value: context.helpers.attrValue(element, 'fs-list-load') ?? '' },
                  ]
                )
              : undefined,
            manualSteps: ['Add fs-list-load to the element with fs-list-element="list".'],
          })
        );
      }

      return issues;
    },
  },
  {
    id: 'LOAD-002',
    solution: 'load',
    title: 'Load method is documented',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      return loadElements(context)
        .filter((element) => {
          const value = context.helpers.attrValue(element, 'fs-list-load');
          return value !== null && !LOAD_METHODS.has(value);
        })
        .map((element) =>
          makeIssue({
            ruleId: 'LOAD-002',
            solution: 'load',
            severity: 'error',
            confidence: 'verified',
            title: `Invalid fs-list-load value "${context.helpers.attrValue(element, 'fs-list-load')}"`,
            explanation: `Allowed values are ${[...LOAD_METHODS].join(', ')}.`,
            whyItMatters: 'Finsweet uses this value to select the loading strategy.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-load']),
            docsUrl: DOCS.load,
          })
        );
    },
  },
  {
    id: 'LOAD-003',
    solution: 'load',
    title: 'Load more requires pagination',
    severity: 'warning',
    confidence: 'partial',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      const issues = [];

      for (const element of loadElements(context)) {
        if (context.helpers.attrValue(element, 'fs-list-load') !== 'more') continue;
        if (element.type !== 'DynamoList' && element.type !== 'DynamoWrapper') continue;
        issues.push(
          makeIssue({
            ruleId: 'LOAD-003',
            solution: 'load',
            severity: 'verify',
            confidence: 'requires-verification',
            title: 'Verify Collection List pagination',
            explanation: `The list ${context.helpers.label(element)} uses fs-list-load="more". Webflow pagination settings could not be reliably confirmed through the Designer API.`,
            whyItMatters: 'The more method relies on native Webflow pagination for CMS lists.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-load']),
            docsUrl: DOCS.load,
            manualSteps: ['Open the Collection List settings and confirm Paginate Items is enabled.'],
          })
        );
      }

      return issues;
    },
  },
  {
    id: 'LOAD-004',
    solution: 'load',
    title: 'Infinite load options',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      const issues = [];

      for (const element of loadElements(context)) {
        if (context.helpers.attrValue(element, 'fs-list-load') !== 'infinite') continue;
        const threshold = context.helpers.attrValue(element, 'fs-list-threshold');
        if (threshold !== null && (!/^\d+$/.test(threshold) || Number(threshold) < 0)) {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-004',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-threshold value "${threshold}"`,
              explanation: 'Threshold must be a non-negative number.',
              whyItMatters: 'Invalid thresholds can cause infinite loading to trigger at the wrong time.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-threshold']),
              docsUrl: DOCS.load,
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'LOAD-005',
    solution: 'load',
    title: 'Pagination controls use supported hosts',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      const supported = new Set(['page-button', 'page-dots', 'page-count', 'scroll-anchor', 'loader']);
      const issues = [];

      for (const element of context.snapshot.elements) {
        const role = context.helpers.attrValue(element, 'fs-list-element');
        if (!role || !supported.has(role)) continue;
        if (['page-button', 'page-dots', 'page-count'].includes(role) && !context.helpers.isLinkLike(element) && element.type !== 'Text' && element.type !== 'Span') {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-005',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Pagination role "${role}" may be on the wrong element`,
              explanation: `${context.helpers.label(element)} is marked as ${role}, but the expected host type was not recognized.`,
              whyItMatters: 'Finsweet expects pagination controls on compatible link or text elements.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.load,
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'LOAD-006',
    solution: 'load',
    title: 'Documented load option values',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.load,
    detect(context) {
      if (!has(context, 'load')) return [];
      const issues = [];

      for (const element of context.snapshot.elements) {
        const animation = context.helpers.attrValue(element, 'fs-list-animation');
        if (animation && !ANIMATIONS.has(animation)) {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-006',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-animation value "${animation}"`,
              explanation: `Allowed values are ${[...ANIMATIONS].join(', ')}.`,
              whyItMatters: 'Unsupported animation names are ignored.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-animation']),
              docsUrl: DOCS.load,
            })
          );
        }

        const easing = context.helpers.attrValue(element, 'fs-list-easing');
        if (easing && !EASINGS.has(easing)) {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-006',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-easing value "${easing}"`,
              explanation: `Allowed values are ${[...EASINGS].join(', ')}.`,
              whyItMatters: 'Unsupported easing names are ignored.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-easing']),
              docsUrl: DOCS.load,
            })
          );
        }

        const loadCount = context.helpers.attrValue(element, 'fs-list-loadcount');
        if (loadCount && loadCount !== 'all' && !/^\d+$/.test(loadCount)) {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-006',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-loadcount value "${loadCount}"`,
              explanation: 'Use a number or all.',
              whyItMatters: 'Load count controls how many items are appended.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-loadcount']),
              docsUrl: DOCS.load,
            })
          );
        }

        const itemsPerPage = context.helpers.attrValue(element, 'fs-list-itemsperpage');
        if (itemsPerPage && !/^\d+$/.test(itemsPerPage)) {
          issues.push(
            makeIssue({
              ruleId: 'LOAD-006',
              solution: 'load',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-itemsperpage value "${itemsPerPage}"`,
              explanation: 'Use a number.',
              whyItMatters: 'Items per page controls the static list page size.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-itemsperpage']),
              docsUrl: DOCS.load,
            })
          );
        }
      }

      return issues;
    },
  },
];
