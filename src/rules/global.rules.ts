import { DOCS, INJECT_SCRIPT_SNIPPET, LIST_SCRIPT_SNIPPET } from '../core/constants';
import { makeIssue } from './rule-utils';
import type { Rule, RuleContext } from '../core/types';

const LIST_SOLUTIONS = new Set(['filter', 'sort', 'load', 'slider', 'select', 'tabs', 'nest', 'combine']);

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export const globalRules: Rule[] = [
  {
    id: 'GLOBAL-001',
    solution: 'global',
    title: 'Universal Attributes v2 script',
    severity: 'error',
    confidence: 'partial',
    docsUrl: DOCS.global,
    detect(context: RuleContext) {
      if (context.solutions.length === 0) return [];

      const source = context.snapshot.scriptEvidence.join('\n');
      const needsInject = context.solutions.some((solution) => solution.key === 'inject');
      const needsList = context.solutions.some((solution) => LIST_SOLUTIONS.has(solution.key));

      if (context.snapshot.scriptAccess !== 'available' || source.trim().length === 0) {
        return [
          makeIssue({
            ruleId: 'GLOBAL-001',
            solution: 'global',
            severity: 'verify',
            confidence: 'requires-verification',
            title: 'Confirm the universal Attributes v2 script',
            explanation:
              'Finsweet v2 loads one universal script. The Designer API did not expose readable page custom code, so this check cannot be completed automatically.',
            whyItMatters:
              'Without the script carrying the correct solution key, Finsweet Attributes will not run on the published page.',
            docsUrl: DOCS.global,
            manualSteps: [
              'Open the page Settings in Webflow.',
              'Check the head custom code field.',
              needsList ? LIST_SCRIPT_SNIPPET : '',
              needsInject ? INJECT_SCRIPT_SNIPPET : '',
            ].filter(Boolean),
          }),
        ];
      }

      const issues = [];
      const hasLibrary = source.includes('@finsweet/attributes@2/attributes.js');
      const scriptCount = countMatches(source, /@finsweet\/attributes@2\/attributes\.js/g);

      if (!hasLibrary) {
        issues.push(
          makeIssue({
            ruleId: 'GLOBAL-001',
            solution: 'global',
            severity: 'error',
            confidence: 'partial',
            title: 'Universal v2 library script was not found',
            explanation:
              'Readable custom code was found, but it does not contain the universal Finsweet Attributes v2 library URL.',
            whyItMatters: 'Finsweet v2 solutions require the universal @finsweet/attributes@2 library.',
            docsUrl: DOCS.global,
            manualSteps: [
              needsList ? LIST_SCRIPT_SNIPPET : '',
              needsInject ? INJECT_SCRIPT_SNIPPET : '',
            ].filter(Boolean),
          })
        );
      }

      if (scriptCount > 1) {
        issues.push(
          makeIssue({
            ruleId: 'GLOBAL-002',
            solution: 'global',
            severity: 'warning',
            confidence: 'partial',
            title: 'Universal script appears more than once',
            explanation: `Found ${scriptCount} references to the universal Attributes script in readable custom code.`,
            whyItMatters: 'Finsweet v2 is universal and only needs one library call per page.',
            docsUrl: DOCS.global,
            manualSteps: ['Keep one script tag containing all required solution keys.'],
          })
        );
      }

      const missingKeys: string[] = [];
      if (needsList && !/\bfs-list(?:\s|>|=)/.test(source)) missingKeys.push('fs-list');
      if (needsInject && !/\bfs-inject(?:\s|>|=)/.test(source)) missingKeys.push('fs-inject');

      if (missingKeys.length > 0) {
        issues.push(
          makeIssue({
            ruleId: 'GLOBAL-001',
            solution: 'global',
            severity: 'error',
            confidence: 'partial',
            title: `Script is missing solution key: ${missingKeys.join(', ')}`,
            explanation: `Detected v2 elements require ${missingKeys.join(' and ')} on the script tag.`,
            whyItMatters: 'The solution key tells the universal library which modules to load.',
            docsUrl: DOCS.global,
            manualSteps: [
              needsList ? LIST_SCRIPT_SNIPPET : '',
              needsInject ? INJECT_SCRIPT_SNIPPET : '',
            ].filter(Boolean),
          })
        );
      }

      return issues;
    },
  },
];
