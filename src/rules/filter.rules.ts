import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue, setFix } from './rule-utils';
import type { Rule, RuleContext } from '../core/types';

function has(context: RuleContext, key: 'filter'): boolean {
  return context.solutions.some((solution) => solution.key === key);
}

const FILTER_ON_VALUES = new Set(['input', 'change', 'submit']);
const LOGIC_VALUES = new Set(['and', 'or']);

export const filterRules: Rule[] = [
  {
    id: 'FILTER-001',
    solution: 'filter',
    title: 'Filter setup requires a marked list',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.filter,
    detect(context) {
      const filters = context.helpers.byAttr('fs-list-element', 'filters');
      if (filters.length === 0) return [];
      const lists = context.helpers.byAttr('fs-list-element', 'list');
      if (lists.length > 0) return [];

      return filters.map((element) =>
        makeIssue({
          ruleId: 'FILTER-001',
          solution: 'filter',
          severity: 'error',
          confidence: 'verified',
          title: 'Filter form has no marked list',
          explanation: `${context.helpers.label(element)} is marked as the filters form, but no element on this page is marked fs-list-element="list".`,
          whyItMatters: 'List Filter needs a target list to apply filters to.',
          elementIds: [element.id],
          evidence: evidenceFor(context, element.id, ['fs-list-element']),
          docsUrl: DOCS.filter,
          manualSteps: ['Add fs-list-element="list" to the Collection List Wrapper or Collection List.'],
        })
      );
    },
  },
  {
    id: 'FILTER-002',
    solution: 'filter',
    title: 'Filters role belongs on a Form element',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.filter,
    detect(context) {
      if (!has(context, 'filter')) return [];
      const issues = [];

      for (const element of context.helpers.byAttr('fs-list-element', 'filters')) {
        if (context.helpers.isForm(element)) continue;
        const nestedForms = context.helpers
          .descendants(element)
          .filter((candidate) => context.helpers.isForm(candidate));

        if (nestedForms.length === 1) {
          const form = nestedForms[0];
          issues.push(
            makeIssue({
              ruleId: 'FILTER-002',
              solution: 'filter',
              severity: 'error',
              confidence: 'verified',
              title: 'Move the filters role to the nested Form',
              explanation: `${context.helpers.label(element)} has fs-list-element="filters" but is not the Form element. A single Form was found inside it.`,
              whyItMatters: 'Finsweet List Filter expects the filters role on the Form element itself.',
              elementIds: [element.id, form.id],
              evidence: [
                ...evidenceFor(context, element.id, ['fs-list-element']),
                ...evidenceFor(context, form.id, ['fs-list-element']),
              ],
              docsUrl: DOCS.filter,
              fix: setFix(
                `FILTER-002:${element.id}`,
                'Move filters role to Form',
                'Remove the role from the outer element and add it to the only nested Form.',
                [
                  { kind: 'remove', elementId: element.id, name: 'fs-list-element' },
                  { kind: 'set', elementId: form.id, name: 'fs-list-element', value: 'filters' },
                ],
                []
              ),
            })
          );
        } else {
          issues.push(
            makeIssue({
              ruleId: 'FILTER-002',
              solution: 'filter',
              severity: 'error',
              confidence: 'verified',
              title: 'Filters role is not on a Form element',
              explanation: `${context.helpers.label(element)} has the filters role but is not a Form, and a unique nested Form could not be detected.`,
              whyItMatters: 'List Filter requires fs-list-element="filters" on the Form element.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.filter,
              manualSteps: ['Add fs-list-element="filters" to the Form element.'],
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'FILTER-003',
    solution: 'filter',
    title: 'Filter field identifiers are paired',
    severity: 'warning',
    confidence: 'partial',
    docsUrl: DOCS.filter,
    detect(context) {
      if (!has(context, 'filter')) return [];
      const issues = [];

      for (const filterForm of context.helpers.byAttr('fs-list-element', 'filters')) {
        const scope = context.helpers.instanceOf(filterForm);
        const controlFields = new Set(
          context.helpers
            .descendants(filterForm)
            .map((element) => context.helpers.attrValue(element, 'fs-list-field'))
            .filter((value): value is string => Boolean(value))
        );
        const itemFields = context.snapshot.elements
          .filter((element) => context.helpers.inScope(element, scope) && context.helpers.isCollectionItemHost(element))
          .flatMap((item) => context.helpers.descendants(item))
          .map((element) => context.helpers.attrValue(element, 'fs-list-field'))
          .filter((value): value is string => Boolean(value));

        for (const field of controlFields) {
          if (itemFields.includes(field)) continue;
          issues.push(
            makeIssue({
              ruleId: 'FILTER-003',
              solution: 'filter',
              severity: 'warning',
              confidence: 'partial',
              title: `No Collection Item field matches "${field}"`,
              explanation: `The filter control uses fs-list-field="${field}", but no matching field was found in a Collection Item on this page.`,
              whyItMatters: 'List Filter compares filter controls with fields on each Collection Item. Identifiers must match.',
              elementIds: context.helpers
                .descendants(filterForm)
                .filter((element) => context.helpers.attrValue(element, 'fs-list-field') === field)
                .map((element) => element.id),
              evidence: evidenceFor(context, filterForm.id, ['fs-list-element']),
              docsUrl: DOCS.filter,
              manualSteps: [`Add fs-list-field="${field}" to the matching Collection Item field element.`],
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'FILTER-004',
    solution: 'filter',
    title: 'Checkbox and radio filters need values',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.filter,
    detect(context) {
      if (!has(context, 'filter')) return [];
      return context.snapshot.elements
        .filter((element) => context.helpers.isCheckboxOrRadio(element))
        .filter((element) => Boolean(context.helpers.attrValue(element, 'fs-list-field')))
        .filter((element) => context.helpers.attrValue(element, 'fs-list-value') === null)
        .map((element) =>
          makeIssue({
            ruleId: 'FILTER-004',
            solution: 'filter',
            severity: 'error',
            confidence: 'verified',
            title: 'Checkbox or radio filter is missing fs-list-value',
            explanation: `${context.helpers.label(element)} has fs-list-field but no fs-list-value.`,
            whyItMatters: 'Checkbox and radio filters need the value to compare against Collection Item fields.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-field', 'fs-list-value']),
            docsUrl: DOCS.filter,
            manualSteps: ['Add fs-list-value="VALUE" with the value that should be matched.'],
          })
        );
    },
  },
  {
    id: 'FILTER-005',
    solution: 'filter',
    title: 'Documented filter enum values',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.filter,
    detect(context) {
      if (!has(context, 'filter')) return [];
      const issues = [];

      for (const element of context.snapshot.elements) {
        const filterOn = context.helpers.attrValue(element, 'fs-list-filteron');
        if (filterOn && !FILTER_ON_VALUES.has(filterOn)) {
          issues.push(
            makeIssue({
              ruleId: 'FILTER-005',
              solution: 'filter',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-filteron value "${filterOn}"`,
              explanation: `Allowed values are ${[...FILTER_ON_VALUES].join(', ')}.`,
              whyItMatters: 'An unsupported event value prevents filters from being applied as expected.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-filteron']),
              docsUrl: DOCS.filter,
            })
          );
        }

        for (const name of ['fs-list-fieldmatch', 'fs-list-filtermatch', 'fs-list-conditionsmatch', 'fs-list-groupsmatch']) {
          const value = context.helpers.attrValue(element, name);
          if (value && !LOGIC_VALUES.has(value)) {
            issues.push(
              makeIssue({
                ruleId: 'FILTER-005',
                solution: 'filter',
                severity: 'warning',
                confidence: 'verified',
                title: `Invalid ${name} value "${value}"`,
                explanation: `This documented matching option accepts ${[...LOGIC_VALUES].join(' or ')}.`,
                whyItMatters: 'Invalid matching values are ignored or produce unexpected filter behavior.',
                elementIds: [element.id],
                evidence: evidenceFor(context, element.id, [name]),
                docsUrl: DOCS.filter,
              })
            );
          }
        }

        const fuzzy = context.helpers.attrValue(element, 'fs-list-fuzzy');
        if (fuzzy && (!/^\d+$/.test(fuzzy) || Number(fuzzy) < 0 || Number(fuzzy) > 100)) {
          issues.push(
            makeIssue({
              ruleId: 'FILTER-005',
              solution: 'filter',
              severity: 'warning',
              confidence: 'verified',
              title: `Invalid fs-list-fuzzy value "${fuzzy}"`,
              explanation: 'Fuzzy matching uses a threshold from 0 to 100.',
              whyItMatters: 'Out-of-range thresholds can disable or distort fuzzy matching.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-fuzzy']),
              docsUrl: DOCS.filter,
            })
          );
        }
      }

      return issues;
    },
  },
];
