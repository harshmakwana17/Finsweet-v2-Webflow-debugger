import { describe, expect, it } from 'vitest';
import { applyFix } from './fix-engine';
import { runRules } from './issue-engine';
import { scanDesigner } from './scanner';
import { createFakeClient, makeElement } from '../test/fixtures';

const SCRIPT = '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-list></script>';

describe('safe fix engine', () => {
  it('applies only the operations in a fix plan and rescans', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['block', 'list'] }),
      makeElement('block', 'FormWrapper', { attrs: { 'fs-list-element': 'filters' }, children: ['form'] }),
      makeElement('form', 'FormForm', { children: ['input'] }),
      makeElement('input', 'FormTextInput', { attrs: { 'fs-list-field': 'title' } }),
      makeElement('list', 'DynamoWrapper', { attrs: { 'fs-list-element': 'list' } }),
    ];
    const { client, byId, notifications } = createFakeClient(elements, { scriptSources: [SCRIPT] });
    const snapshot = await scanDesigner(client);
    const issue = runRules(snapshot).issues.find((item) => item.ruleId === 'FILTER-002')!;
    let rescans = 0;

    const outcome = await applyFix(client, snapshot, issue.fix!, async () => {
      rescans += 1;
      return scanDesigner(client);
    });

    expect(outcome.ok).toBe(true);
    expect(rescans).toBe(1);
    expect(byId.get('block')?.attributeValues['fs-list-element']).toBeUndefined();
    expect(byId.get('form')?.attributeValues['fs-list-element']).toBe('filters');
    expect(notifications.at(-1)?.type).toBe('success');
  });

  it('does not invent fixes for author-defined identifiers', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['list'] }),
      makeElement('list', 'DynamoWrapper', {
        attrs: { 'fs-list-element': 'list', 'fs-list-load': 'banana' },
      }),
    ];
    const { client } = createFakeClient(elements, { scriptSources: [SCRIPT] });
    const issue = runRules(await scanDesigner(client)).issues.find((item) => item.ruleId === 'LOAD-002')!;

    expect(issue.fix).toBeUndefined();
  });
});
