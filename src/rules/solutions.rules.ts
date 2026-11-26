import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue, setFix } from './rule-utils';
import type { Rule, RuleContext, SolutionKey } from '../core/types';

function has(context: RuleContext, key: SolutionKey): boolean {
  return context.solutions.some((solution) => solution.key === key);
}

function requireList(context: RuleContext, ruleId: string, solution: SolutionKey, evidenceIds: string[]) {
  if (context.helpers.byAttr('fs-list-element', 'list').length > 0) return [];
  return [
    makeIssue({
      ruleId,
      solution,
      severity: 'error',
      confidence: 'verified',
      title: 'Solution has no marked list',
      explanation: 'This solution is detected, but no element is marked fs-list-element="list".',
      whyItMatters: 'All Finsweet List solutions need a target list.',
      elementIds: evidenceIds,
      evidence: evidenceIds.flatMap((id) => evidenceFor(context, id, ['fs-list-element'])),
      docsUrl: DOCS[solution === 'global' ? 'global' : solution],
      manualSteps: ['Add fs-list-element="list" to the Collection List Wrapper or Collection List.'],
    }),
  ];
}

function uniqueCandidateFix(
  context: RuleContext,
  ruleId: string,
  candidates: ReturnType<typeof Object.values>,
  role: string,
  title: string
) {
  if (candidates.length !== 1) return undefined;
  const element = candidates[0] as { id: string };
  if (context.helpers.attrValue(element as never, 'fs-list-element') === role) return undefined;
  return setFix(
    `${ruleId}:${element.id}`,
    title,
    `Add the verified ${role} role to the only supported candidate.`,
    [{ kind: 'set', elementId: element.id, name: 'fs-list-element', value: role }]
  );
}

export const solutionRules: Rule[] = [
  {
    id: 'SLIDER-001',
    solution: 'slider',
    title: 'Slider setup',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.slider,
    detect(context) {
      if (!has(context, 'slider')) return [];
      const sliders = context.helpers.byAttr('fs-list-element', 'slider');
      const issues = requireList(
        context,
        'SLIDER-001',
        'slider',
        sliders.map((element) => element.id)
      );

      if (sliders.length === 0) {
        const candidates = context.snapshot.elements.filter((element) => context.helpers.isSlider(element));
        if (candidates.length === 1) {
          const element = candidates[0];
          issues.push(
            makeIssue({
              ruleId: 'SLIDER-001',
              solution: 'slider',
              severity: 'error',
              confidence: 'verified',
              title: 'Slider is missing its role',
              explanation: `${context.helpers.label(element)} is the only Slider on the page but has no fs-list-element="slider".`,
              whyItMatters: 'List Slider needs the slider role on a native Webflow Slider.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.slider,
              fix: uniqueCandidateFix(context, 'SLIDER-001', candidates, 'slider', 'Add slider role'),
            })
          );
        }
      }

      for (const element of sliders) {
        if (!context.helpers.isSlider(element)) {
          issues.push(
            makeIssue({
              ruleId: 'SLIDER-001',
              solution: 'slider',
              severity: 'error',
              confidence: 'verified',
              title: 'Slider role is on an unsupported element',
              explanation: `${context.helpers.label(element)} is marked as a slider but is not a Slider element.`,
              whyItMatters: 'List Slider uses a native Webflow Slider.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.slider,
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'SLIDER-002',
    solution: 'slider',
    title: 'Reset interactions value',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.slider,
    detect(context) {
      if (!has(context, 'slider')) return [];
      return context.snapshot.elements
        .filter((element) => {
          const value = context.helpers.attrValue(element, 'fs-list-resetix');
          return value !== null && !['true', 'false'].includes(value);
        })
        .map((element) =>
          makeIssue({
            ruleId: 'SLIDER-002',
            solution: 'slider',
            severity: 'warning',
            confidence: 'verified',
            title: `Invalid fs-list-resetix value "${context.helpers.attrValue(element, 'fs-list-resetix')}"`,
            explanation: 'Use true or false.',
            whyItMatters: 'This option enables or disables interaction reset behavior.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-resetix']),
            docsUrl: DOCS.slider,
          })
        );
    },
  },
  {
    id: 'SELECT-001',
    solution: 'select',
    title: 'Select setup',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.select,
    detect(context) {
      if (!has(context, 'select')) return [];
      const selects = context.helpers.byAttr('fs-list-element', 'select');
      const issues = requireList(context, 'SELECT-001', 'select', selects.map((element) => element.id));

      if (selects.length === 0) {
        const candidates = context.snapshot.elements.filter((element) => context.helpers.isSelect(element));
        if (candidates.length === 1 && context.helpers.byAttr('fs-list-element', 'select-value').length > 0) {
          const element = candidates[0];
          issues.push(
            makeIssue({
              ruleId: 'SELECT-001',
              solution: 'select',
              severity: 'error',
              confidence: 'verified',
              title: 'Form Select is missing its role',
              explanation: `${context.helpers.label(element)} is the only Select on the page but has no fs-list-element="select".`,
              whyItMatters: 'List Select needs the select role on a Form Select.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.select,
              fix: uniqueCandidateFix(context, 'SELECT-001', candidates, 'select', 'Add select role'),
            })
          );
        }
      }

      for (const select of selects) {
        if (!context.helpers.isSelect(select)) {
          issues.push(
            makeIssue({
              ruleId: 'SELECT-001',
              solution: 'select',
              severity: 'error',
              confidence: 'verified',
              title: 'Select role is on an unsupported element',
              explanation: `${context.helpers.label(select)} is marked as a select but is not a Form Select.`,
              whyItMatters: 'List Select requires a Form Select element.',
              elementIds: [select.id],
              evidence: evidenceFor(context, select.id, ['fs-list-element']),
              docsUrl: DOCS.select,
            })
          );
        }

        const itemValues = context.snapshot.elements
          .filter((element) => context.helpers.isCollectionItemHost(element))
          .flatMap((item) => context.helpers.descendants(item))
          .filter((element) => context.helpers.attrValue(element, 'fs-list-element') === 'select-value');

        if (itemValues.length === 0) {
          issues.push(
            makeIssue({
              ruleId: 'SELECT-001',
              solution: 'select',
              severity: 'warning',
              confidence: 'verified',
              title: 'No element is marked select-value',
              explanation: `${context.helpers.label(select)} is configured, but no Collection Item content is marked fs-list-element="select-value".`,
              whyItMatters: 'List Select reads option values from elements marked select-value.',
              elementIds: [select.id],
              evidence: evidenceFor(context, select.id, ['fs-list-element']),
              docsUrl: DOCS.select,
              manualSteps: ['Add fs-list-element="select-value" to the text element inside the Collection Item.'],
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'TABS-001',
    solution: 'tabs',
    title: 'Tabs setup',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.tabs,
    detect(context) {
      if (!has(context, 'tabs')) return [];
      const tabsElements = context.helpers.byAttr('fs-list-element', 'tabs');
      const issues = requireList(context, 'TABS-001', 'tabs', tabsElements.map((element) => element.id));

      for (const element of tabsElements) {
        if (!context.helpers.isTabs(element)) {
          issues.push(
            makeIssue({
              ruleId: 'TABS-001',
              solution: 'tabs',
              severity: 'error',
              confidence: 'verified',
              title: 'Tabs role is on an unsupported element',
              explanation: `${context.helpers.label(element)} is marked as tabs but is not a Tabs element.`,
              whyItMatters: 'List Tabs uses a native Webflow Tabs element.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.tabs,
            })
          );
        }

        const links = context.snapshot.elements
          .filter((item) => context.helpers.isCollectionItemHost(item))
          .flatMap((item) => context.helpers.descendants(item))
          .filter((element) => context.helpers.attrValue(element, 'fs-list-element') === 'tab-link');
        if (links.length === 0) {
          issues.push(
            makeIssue({
              ruleId: 'TABS-001',
              solution: 'tabs',
              severity: 'warning',
              confidence: 'verified',
              title: 'No element is marked tab-link',
              explanation: 'No Collection Item content is marked fs-list-element="tab-link".',
              whyItMatters: 'List Tabs needs tab links generated from Collection Item content.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-element']),
              docsUrl: DOCS.tabs,
              manualSteps: ['Add fs-list-element="tab-link" to the link element inside each Collection Item.'],
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'COMBINE-001',
    solution: 'combine',
    title: 'Combine target list',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.combine,
    detect(context) {
      if (!has(context, 'combine')) return [];
      return context.helpers
        .byAttr('fs-list-combine')
        .filter((element) => context.helpers.attrValue(element, 'fs-list-element') !== 'list')
        .map((element) =>
          makeIssue({
            ruleId: 'COMBINE-001',
            solution: 'combine',
            severity: 'error',
            confidence: 'verified',
            title: 'Combine identifier is not on a marked list',
            explanation: `${context.helpers.label(element)} has fs-list-combine but not fs-list-element="list".`,
            whyItMatters: 'The target combined list must be marked as a list.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-element', 'fs-list-combine']),
            docsUrl: DOCS.combine,
          })
        );
    },
  },
  {
    id: 'COMBINE-002',
    solution: 'combine',
    title: 'Combined lists share an instance identifier',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.combine,
    detect(context) {
      if (!has(context, 'combine')) return [];
      const combineTargets = context.helpers.byAttr('fs-list-combine');
      const issues = [];

      for (const target of combineTargets) {
        const identifier = context.helpers.attrValue(target, 'fs-list-combine');
        if (!identifier) continue;
        const sourceLists = context.helpers
          .byAttr('fs-list-element', 'list')
          .filter((element) => element.id !== target.id && context.helpers.instanceOf(element) === identifier);
        if (sourceLists.length === 0) {
          issues.push(
            makeIssue({
              ruleId: 'COMBINE-002',
              solution: 'combine',
              severity: 'warning',
              confidence: 'verified',
              title: `No combined list uses instance "${identifier}"`,
              explanation: `The target list uses fs-list-combine="${identifier}", but no other list on this page uses that instance.`,
              whyItMatters: 'List Combine gathers lists whose fs-list-instance matches the target identifier.',
              elementIds: [target.id],
              evidence: evidenceFor(context, target.id, ['fs-list-combine', 'fs-list-instance']),
              docsUrl: DOCS.combine,
              manualSteps: [`Add fs-list-instance="${identifier}" to each source list.`],
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'NEST-001',
    solution: 'nest',
    title: 'Nest setup',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.nest,
    detect(context) {
      if (!has(context, 'nest')) return [];
      const nests = context.helpers.byAttr('fs-list-nest');
      const issues = requireList(context, 'NEST-001', 'nest', nests.map((element) => element.id));

      for (const element of nests) {
        if (!context.helpers.isCollectionItemHost(element) && !context.helpers.ancestor(element, (candidate) => context.helpers.isCollectionItemHost(candidate))) {
          issues.push(
            makeIssue({
              ruleId: 'NEST-001',
              solution: 'nest',
              severity: 'warning',
              confidence: 'partial',
              title: 'Nest identifier is outside a Collection Item',
              explanation: `${context.helpers.label(element)} has fs-list-nest but is not inside a Collection Item or marked item.`,
              whyItMatters: 'List Nest expects the nest target inside each parent Collection Item.',
              elementIds: [element.id],
              evidence: evidenceFor(context, element.id, ['fs-list-nest']),
              docsUrl: DOCS.nest,
            })
          );
        }
      }

      return issues;
    },
  },
  {
    id: 'NEST-002',
    solution: 'nest',
    title: 'Cross-page nested list requires verification',
    severity: 'verify',
    confidence: 'requires-verification',
    docsUrl: DOCS.nest,
    detect(context) {
      if (!has(context, 'nest')) return [];
      return context.helpers
        .byAttr('fs-list-nest')
        .map((element) =>
          makeIssue({
            ruleId: 'NEST-002',
            solution: 'nest',
            severity: 'verify',
            confidence: 'requires-verification',
            title: 'Verify the nested Collection Template list',
            explanation: `The identifier "${context.helpers.attrValue(element, 'fs-list-nest')}" must match fs-list-instance on a nested list on the Collection Template page.`,
            whyItMatters: 'List Nest connects elements across two pages, which this current-page scanner cannot verify.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-list-nest', 'fs-list-instance']),
            docsUrl: DOCS.nest,
            manualSteps: [
              'Open the Collection Template page for the parent collection.',
              'Add fs-list-element="wrapper" to the nested Collection List Wrapper.',
              `Add fs-list-instance="${context.helpers.attrValue(element, 'fs-list-nest') ?? 'IDENTIFIER'}" with the matching identifier.`,
            ],
          })
        );
    },
  },
  {
    id: 'INJECT-001',
    solution: 'inject',
    title: 'Inject source and target pairs',
    severity: 'error',
    confidence: 'verified',
    docsUrl: DOCS.inject,
    detect(context) {
      if (!has(context, 'inject')) return [];
      const sources = context.helpers.byAttr('fs-inject-element', 'element');
      const targets = context.helpers.byAttr('fs-inject-element', 'target');
      const issues = [];

      if (sources.length === 0) {
        issues.push(
          makeIssue({
            ruleId: 'INJECT-001',
            solution: 'inject',
            severity: 'error',
            confidence: 'verified',
            title: 'No Inject source element',
            explanation: 'Inject attributes were found, but no element is marked fs-inject-element="element".',
            whyItMatters: 'Inject needs a source element to copy.',
            docsUrl: DOCS.inject,
            manualSteps: ['Add fs-inject-element="element" to the source element.'],
          })
        );
      }

      if (targets.length === 0) {
        issues.push(
          makeIssue({
            ruleId: 'INJECT-001',
            solution: 'inject',
            severity: 'error',
            confidence: 'verified',
            title: 'No Inject target element',
            explanation: 'Inject attributes were found, but no element is marked fs-inject-element="target".',
            whyItMatters: 'Inject needs a target element to receive the source.',
            docsUrl: DOCS.inject,
            manualSteps: ['Add fs-inject-element="target" to a Div Block or Rich Text element.'],
          })
        );
      }

      return issues;
    },
  },
  {
    id: 'INJECT-002',
    solution: 'inject',
    title: 'Inject source paths require verification',
    severity: 'verify',
    confidence: 'requires-verification',
    docsUrl: DOCS.inject,
    detect(context) {
      if (!has(context, 'inject')) return [];
      return context.helpers
        .byAttr('fs-inject-source')
        .filter((element) => (context.helpers.attrValue(element, 'fs-inject-source') ?? '').trim().length > 0)
        .map((element) =>
          makeIssue({
            ruleId: 'INJECT-002',
            solution: 'inject',
            severity: 'verify',
            confidence: 'requires-verification',
            title: 'Verify cross-page Inject source path',
            explanation: `The path "${context.helpers.attrValue(element, 'fs-inject-source')}" points to content outside the current canvas.`,
            whyItMatters: 'The Designer API cannot confirm that another page or site path contains a matching source element.',
            elementIds: [element.id],
            evidence: evidenceFor(context, element.id, ['fs-inject-source']),
            docsUrl: DOCS.inject,
            manualSteps: ['Open the source page and confirm its Inject source identifier.'],
          })
        );
    },
  },
  {
    id: 'INJECT-003',
    solution: 'inject',
    title: 'Multiple Inject pairs are scoped',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.inject,
    detect(context) {
      if (!has(context, 'inject')) return [];
      const sources = context.helpers.byAttr('fs-inject-element', 'element');
      const targets = context.helpers.byAttr('fs-inject-element', 'target');
      if (sources.length + targets.length <= 2) return [];

      const unscoped = [...sources, ...targets].filter(
        (element) => !context.helpers.attrValue(element, 'fs-inject-instance')
      );
      if (unscoped.length === 0) return [];

      return [
        makeIssue({
          ruleId: 'INJECT-003',
          solution: 'inject',
          severity: 'warning',
          confidence: 'verified',
          title: 'Multiple Inject pairs need instances',
          explanation: `${unscoped.length} Inject elements have no fs-inject-instance value.`,
          whyItMatters: 'Matching instance identifiers keep multiple Inject pairs on the same page independent.',
          elementIds: unscoped.map((element) => element.id),
          evidence: unscoped.flatMap((element) => evidenceFor(context, element.id, ['fs-inject-element', 'fs-inject-instance'])),
          docsUrl: DOCS.inject,
          manualSteps: ['Add matching fs-inject-instance="IDENTIFIER" values to each source and target pair.'],
        }),
      ];
    },
  },
];
