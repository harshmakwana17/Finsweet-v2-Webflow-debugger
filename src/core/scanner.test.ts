import { describe, expect, it } from 'vitest';
import { runRules } from './issue-engine';
import { calculateScore } from './score';
import { scanDesigner } from './scanner';
import { createFakeClient, makeElement } from '../test/fixtures';

async function scanAndRun(elements: ReturnType<typeof makeElement>[], scriptSources: string[] = []) {
  const { client, operations } = createFakeClient(elements, { scriptSources });
  const result = runRules(await scanDesigner(client));
  return { result, operations };
}

describe('designer scanner', () => {
  it('builds parent/child relationships from the root element', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['form'] }),
      makeElement('form', 'FormForm', { children: ['input'] }),
      makeElement('input', 'FormTextInput'),
    ];
    const { result } = await scanAndRun(elements);

    expect(result.snapshot.elements).toHaveLength(3);
    expect(result.snapshot.byId.get('form')?.parentId).toBe('root');
    expect(result.snapshot.byId.get('input')?.parentId).toBe('form');
    expect(result.snapshot.byId.get('root')?.childIds).toEqual(['form']);
  });

  it('normalizes resolved attribute values and keeps element labels', async () => {
    const elements = [
      makeElement('root', 'DOM', { children: ['list'] }),
      makeElement('list', 'DynamoWrapper', {
        attrs: { 'fs-list-element': 'list', 'fs-list-instance': 'blog' },
        displayName: 'Blog Posts',
      }),
    ];
    const { result } = await scanAndRun(elements);
    const list = result.snapshot.byId.get('list')!;

    expect(list.displayName).toBe('Blog Posts');
    expect(list.attributes.map((attribute) => attribute.name)).toEqual(['fs-list-element', 'fs-list-instance']);
    expect(list.attributes[0].value).toBe('list');
  });
});

describe('health score', () => {
  it('is not applicable when no v2 markers exist', async () => {
    const { result } = await scanAndRun([
      makeElement('root', 'DOM', { children: ['text'] }),
      makeElement('text', 'Text'),
    ]);
    const score = calculateScore(result.issues, result.context.solutions.length > 0);

    expect(score.value).toBeNull();
    expect(score.label).toBe('Not applicable');
  });
});
