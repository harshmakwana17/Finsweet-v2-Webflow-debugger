import { describe, expect, it } from 'vitest';
import { runRules } from '../core/issue-engine';
import { scanDesigner } from '../core/scanner';
import { createFakeClient, makeElement } from '../test/fixtures';

async function run(elements: ReturnType<typeof makeElement>[], scriptSources: string[] = []) {
  const { client } = createFakeClient(elements, { scriptSources });
  return runRules(await scanDesigner(client));
}

const SCRIPT = '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-list></script>';

function filterSetup() {
  return [
    makeElement('root', 'DOM', { children: ['form', 'wrapper'] }),
    makeElement('form', 'FormForm', { attrs: { 'fs-list-element': 'filters' }, children: ['input'] }),
    makeElement('input', 'FormTextInput', { attrs: { 'fs-list-field': 'title' } }),
    makeElement('wrapper', 'DynamoWrapper', { attrs: { 'fs-list-element': 'list' }, children: ['list'] }),
    makeElement('list', 'DynamoList', { children: ['item'] }),
    makeElement('item', 'DynamoItem', { children: ['field'] }),
    makeElement('field', 'Text', { attrs: { 'fs-list-field': 'title' } }),
  ];
}

describe('Finsweet v2 rules', () => {
  it('accepts a valid List Filter setup', async () => {
    const result = await run(filterSetup(), [SCRIPT]);

    expect(result.context.solutions.map((solution) => solution.key)).toContain('filter');
    expect(result.issues.filter((issue) => issue.ruleId.startsWith('FILTER-'))).toHaveLength(0);
    expect(result.issues.filter((issue) => issue.ruleId === 'GLOBAL-001')).toHaveLength(0);
  });

  it('requests manual script verification when custom code is unreadable', async () => {
    const result = await run(filterSetup());
    const scriptIssue = result.issues.find((issue) => issue.ruleId === 'GLOBAL-001');

    expect(scriptIssue?.severity).toBe('verify');
    expect(scriptIssue?.confidence).toBe('requires-verification');
  });

  it('reports a missing solution key in readable script code', async () => {
    const result = await run(filterSetup(), [
      '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"></script>',
    ]);
    const scriptIssue = result.issues.find((issue) => issue.ruleId === 'GLOBAL-001');

    expect(scriptIssue?.severity).toBe('error');
    expect(scriptIssue?.title).toContain('fs-list');
  });

  it('detects the filters role on a FormBlock wrapper and offers a safe fix', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['block'] }),
      makeElement('block', 'FormWrapper', { attrs: { 'fs-list-element': 'filters' }, children: ['form'] }),
      makeElement('form', 'FormForm', { children: ['input'] }),
      makeElement('input', 'FormTextInput', { attrs: { 'fs-list-field': 'title' } }),
      makeElement('wrapper', 'DynamoWrapper', { attrs: { 'fs-list-element': 'list' } }),
    ];
    const result = await run(elements, [SCRIPT]);
    const issue = result.issues.find((item) => item.ruleId === 'FILTER-002');

    expect(issue).toBeDefined();
    expect(issue?.fix?.operations).toEqual([
      { kind: 'remove', elementId: 'block', name: 'fs-list-element' },
      { kind: 'set', elementId: 'form', name: 'fs-list-element', value: 'filters' },
    ]);
  });

  it('rejects an invalid List Load method', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['list'] }),
      makeElement('list', 'DynamoWrapper', {
        attrs: { 'fs-list-element': 'list', 'fs-list-load': 'banana' },
      }),
    ];
    const result = await run(elements, [SCRIPT]);

    expect(result.context.solutions.map((solution) => solution.key)).toContain('load');
    expect(result.issues.some((issue) => issue.ruleId === 'LOAD-002')).toBe(true);
  });

  it('flags two list instances with the same identifier', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['scope-a', 'scope-b'] }),
      makeElement('scope-a', 'DOM', { attrs: { 'fs-list-instance': 'blog' }, children: ['list-a'] }),
      makeElement('list-a', 'DynamoWrapper', { attrs: { 'fs-list-element': 'list' } }),
      makeElement('scope-b', 'DOM', { attrs: { 'fs-list-instance': 'blog' }, children: ['list-b'] }),
      makeElement('list-b', 'DynamoWrapper', { attrs: { 'fs-list-element': 'list' } }),
    ];
    const result = await run(elements, [SCRIPT]);

    expect(result.issues.some((issue) => issue.ruleId === 'LIST-003')).toBe(true);
  });

  it('never implements legacy fs-cms rules', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['legacy'] }),
      makeElement('legacy', 'DOM', {
        attrs: { 'fs-cmsfilter-element': 'filters', 'fs-cmsload-element': 'list' },
      }),
    ];
    const result = await run(elements);

    expect(result.context.solutions).toHaveLength(0);
    expect(result.issues.some((issue) => issue.ruleId.startsWith('CMS'))).toBe(false);
  });
});
