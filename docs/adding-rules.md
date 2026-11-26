# Adding rules

Rules are pure functions. They receive a normalized scan snapshot and return issues. They never call Webflow APIs directly.

## 1. Verify the documentation first

A rule must link to a current official Finsweet Attributes **v2** page. Do not use v1 docs, blog posts, or inferred behavior.

If a behavior depends on another page, CMS data, custom code, or settings that Designer APIs cannot expose, set:

```ts
confidence: 'requires-verification';
severity: 'verify';
```

Provide manual steps instead of presenting it as a definite error.

## 2. Add the rule

Create or edit a file in `src/rules/` and add a typed `Rule`:

```ts
import { DOCS } from '../core/constants';
import { evidenceFor, makeIssue } from './rule-utils';
import type { Rule } from '../core/types';

export const exampleRules: Rule[] = [
  {
    id: 'EXAMPLE-001',
    solution: 'filter',
    title: 'Example rule',
    severity: 'warning',
    confidence: 'verified',
    docsUrl: DOCS.filter,
    detect(context) {
      return [];
    },
  },
];
```

Then register it in `src/rules/registry.ts`.

## 3. Use the context helpers

`RuleContext` provides:

- `snapshot.elements`, `snapshot.byId`, and `snapshot.attributeIndex`
- `context.solutions`
- `helpers.attr` / `helpers.attrValue`
- `helpers.byAttr`
- `helpers.children` / `helpers.descendants`
- `helpers.ancestors` / `helpers.ancestor`
- `helpers.instanceOf` / `helpers.inScope`
- element-type guards such as `isForm`, `isSelect`, `isSlider`, and `isCollectionItemHost`

Use `makeIssue()` and `evidenceFor()` so issue IDs, evidence formatting, and documentation links remain consistent.

## 4. Safe fix requirements

A `fix` may only be attached when:

- the target is unambiguous
- no author-defined identifier is guessed
- no bound or unresolved attribute is overwritten
- no custom code or cross-page setting is changed
- all operations use `setAttribute()` or `setCustomAttribute()` indirectly through `FixOperation`
- preconditions confirm the current snapshot still matches the issue

Never use `setAttributes()` for a partial fix because it replaces the entire attribute set.

## 5. Add fixtures and tests

Use `makeElement()` and `createFakeClient()` from `src/test/fixtures.ts`.

```ts
const elements = [
  makeElement('root', 'DOM', { children: ['list'] }),
  makeElement('list', 'DynamoWrapper', {
    attrs: { 'fs-list-element': 'list' },
  }),
];
```

Add at least one positive fixture and one negative fixture. Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 6. Update documentation

Add the rule to `docs/finsweet-v2-rule-inventory.md` with its ID, condition, severity, confidence, auto-fix status, and official source URL.
