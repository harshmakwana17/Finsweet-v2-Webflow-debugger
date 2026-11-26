# Finsweet Attributes v2 rule inventory

Every rule in this inventory is based on current official Finsweet Attributes v2 documentation. Legacy v1 rules and `fs-cms*` attributes are intentionally excluded.

Confidence values:

- **verified** — documented and checkable from the current Designer canvas
- **partial** — documented, but only part of the setup can be checked through Designer APIs
- **requires-verification** — depends on custom code, another page, CMS data, or settings not reliably exposed by Designer APIs

## Global and common list rules

| ID | Solution | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|---|
| `GLOBAL-001` | global | If v2 markers exist, confirm the universal script and solution key (`fs-list` / `fs-inject`). If code is unreadable, report a verification item. | error / verify | partial / requires-verification | No | [Script tag](https://finsweet.com/attributes/how-to-set-the-script-tag) |
| `GLOBAL-002` | global | Warn when the universal script appears more than once in readable code. | warning | partial | No | [Script tag](https://finsweet.com/attributes/how-to-set-the-script-tag) |
| `LIST-001` | global | `fs-list-element="list"` must be on a Collection List or supported static-list host. | error | verified | No | [Non-CMS lists](https://finsweet.com/attributes/how-to-use-non-cms-lists) |
| `LIST-002` | global | Static lists require a documented `wrapper` → `list` → `item` structure. | warning | verified | No | [Non-CMS lists](https://finsweet.com/attributes/how-to-use-non-cms-lists) |
| `LIST-003` | global | Multiple independent instances require matching `fs-list-instance` values. | warning | verified | No | [Instances](https://finsweet.com/attributes/how-to-use-multiple-instances) |
| `LIST-004` | global | Warn on unrecognized `fs-list-element` values. | warning | partial | No | [All solutions](https://finsweet.com/attributes/list-filter) |

## List Filter

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `FILTER-001` | A filters form requires a marked list. | error | verified | No | [List Filter](https://finsweet.com/attributes/list-filter) |
| `FILTER-002` | `fs-list-element="filters"` must be on a Form element; move it from a single nested FormBlock wrapper when unambiguous. | error | verified | Yes | [List Filter](https://finsweet.com/attributes/list-filter) |
| `FILTER-003` | Filter control identifiers should match identifiers on Collection Item fields. | warning | partial | No | [List Filter](https://finsweet.com/attributes/list-filter) |
| `FILTER-004` | Checkbox and radio filters require `fs-list-value`. | error | verified | No | [List Filter](https://finsweet.com/attributes/list-filter) |
| `FILTER-005` | Validate documented enum/range values: `fs-list-filteron`, matching logic options, and `fs-list-fuzzy`. | warning | verified | No | [List Filter](https://finsweet.com/attributes/list-filter) |

## List Sort

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `SORT-001` | A sort trigger requires a marked list. | error | verified | No | [List Sort](https://finsweet.com/attributes/list-sort) |
| `SORT-002` | Sort trigger must be on a Select, Dropdown link, Button, Text Link, or Link Block. | error | verified | No | [List Sort](https://finsweet.com/attributes/list-sort) |
| `SORT-003` | Add `sort-trigger` when sort-specific attributes exist and exactly one supported candidate exists. | warning | partial | Yes | [List Sort](https://finsweet.com/attributes/list-sort) |
| `SORT-004` | Sort field identifiers should use documented `-asc` / `-desc` direction syntax. | warning | verified | No | [List Sort](https://finsweet.com/attributes/list-sort) |
| `SORT-005` | Validate `fs-list-fieldtype` and `fs-list-reverse`. | warning | verified | No | [List Sort](https://finsweet.com/attributes/list-sort) |

## List Load

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `LOAD-001` | `fs-list-load` and `fs-list-element="list"` must share one element. | error | verified | Yes, when one list exists | [List Load](https://finsweet.com/attributes/list-load) |
| `LOAD-002` | `fs-list-load` must be `more`, `all`, `infinite`, or `pagination`. | error | verified | No | [List Load](https://finsweet.com/attributes/list-load) |
| `LOAD-003` | Verify native Webflow pagination for the `more` method. | verify | requires-verification | No | [List Load](https://finsweet.com/attributes/list-load) |
| `LOAD-004` | Validate `fs-list-threshold` for infinite loading. | warning | verified | No | [List Load](https://finsweet.com/attributes/list-load) |
| `LOAD-005` | Pagination controls should use supported hosts. | warning | verified | No | [List Load](https://finsweet.com/attributes/list-load) |
| `LOAD-006` | Validate animation, easing, load count, and items-per-page values. | warning | verified | No | [List Load](https://finsweet.com/attributes/list-load) |

## List Slider

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `SLIDER-001` | Requires a marked list and a Slider marked `fs-list-element="slider"`. | error | verified | Yes, when one Slider exists | [List Slider](https://finsweet.com/attributes/list-slider) |
| `SLIDER-002` | Validate optional `fs-list-resetix`. | warning | verified | No | [List Slider](https://finsweet.com/attributes/list-slider) |

## List Select

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `SELECT-001` | Requires a marked list, a Form Select marked `select`, and content marked `select-value`. | error / warning | verified | Yes, when one Select exists | [List Select](https://finsweet.com/attributes/list-select) |

## List Tabs

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `TABS-001` | Requires a marked list, a Tabs element marked `tabs`, and content marked `tab-link`. | error / warning | verified | No | [List Tabs](https://finsweet.com/attributes/list-tabs) |

## List Combine

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `COMBINE-001` | Target list needs `fs-list-combine` on the marked list. | error | verified | No | [List Combine](https://finsweet.com/attributes/list-combine) |
| `COMBINE-002` | Source lists need matching `fs-list-instance` identifiers. | warning | verified | No | [List Combine](https://finsweet.com/attributes/list-combine) |

## List Nest

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `NEST-001` | Requires a marked list and nest attributes inside a Collection Item where checkable. | error / warning | verified / partial | No | [List Nest](https://finsweet.com/attributes/list-nest) |
| `NEST-002` | Verify the cross-page nested Collection Template list and matching instance. | verify | requires-verification | No | [List Nest](https://finsweet.com/attributes/list-nest) |

## Inject

| ID | Condition | Severity | Confidence | Auto-fix | Source |
|---|---|---|---|---|---|
| `INJECT-001` | Requires source and target elements. | error | verified | No | [Inject](https://finsweet.com/attributes/inject) |
| `INJECT-002` | Verify cross-page or cross-site source paths. | verify | requires-verification | No | [Inject](https://finsweet.com/attributes/inject) |
| `INJECT-003` | Multiple Inject pairs need matching instance identifiers. | warning | verified | No | [Instances](https://finsweet.com/attributes/how-to-use-multiple-instances) |

## Rules intentionally not implemented

- Any Finsweet v1 rule
- Any `fs-cmsfilter-*`, `fs-cmsload-*`, `fs-cmssort-*`, or other legacy `fs-cms*` rule
- Any rule whose value set cannot be tied to a current official v2 documentation page

Adding a new rule requires a source URL and a fixture. See [adding-rules.md](adding-rules.md).
