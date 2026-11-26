# Finsweet Attributes v2 Debugger

A Webflow Designer Extension that scans the current page or component for Finsweet Attributes **v2** configuration problems, explains them, locates affected elements, and applies only deterministic safe fixes.

> Independent developer tool. Not affiliated with Finsweet.

## Scope

- Supports **Finsweet Attributes v2 only**
- Supports List Filter, List Sort, List Load, List Slider, List Select, List Tabs, List Nest, List Combine, Inject, instances, static lists, and universal script guidance
- Deliberately excludes Finsweet v1 and all legacy `fs-cms*` attributes
- Uses official Webflow Designer Extension APIs only
- Scans the current Designer page or current component; it does not scrape the DOM or use private Webflow UI selectors

## Requirements

- Node.js 20+
- Webflow Designer with extension development enabled
- Designer permissions:
  - `canAccessCanvas` for scanning
  - `canEdit` for applying fixes

## Commands

```bash
npm install
npm run dev        # Vite development server
npm run serve      # webflow extension serve
npm run typecheck
npm run lint
npm run test
npm run build
```

`dist/` is the extension public directory configured in `webflow.json`.

## Local development

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run serve` and open the extension in a Webflow project.
4. Click **Scan**.
5. Use **Locate element** to select an affected element on the canvas.
6. Use **Apply safe fix** only when a deterministic fix is available.
7. The extension rescans automatically after a fix.

Outside the Webflow Designer, the UI renders but reports that the Designer API is unavailable. This is intentional and prevents fake scan results.

## Confidence and health score

Issues use three confidence levels:

| Confidence | Meaning |
|---|---|
| `verified` | Directly documented v2 rule that can be checked on the current canvas |
| `partial` | Documented rule where the extension can only check part of the setup |
| `requires-verification` | Depends on custom code, another page, CMS data, or settings not reliably exposed by Designer APIs |

Health scoring starts at 100 only when at least one v2 solution marker is detected. Confirmed errors and warnings deduct points. Verification and info items do not. With no v2 markers, the score shows **Not applicable** instead of a false 100.

## Safe fixes

The fix engine may only add or remove deterministic attributes when there is exactly one unambiguous target. It never guesses:

- author-defined identifiers (`fs-list-field`, `fs-list-instance`, `fs-list-nest`, `fs-inject-source`)
- load methods
- CMS or Collection List settings
- bound or unresolved attribute values
- script/custom code
- cross-page configuration

Fixes always use `setAttribute()` or `setCustomAttribute()`. The extension never uses `setAttributes()` for partial changes because that API replaces the complete attribute set.

## Known limitations

- Finsweet’s universal script normally lives in page or project custom code. Webflow does not expose site-wide custom code to Designer Extensions. The extension reports a verification item and provides copyable snippets when script text cannot be read.
- Finsweet Attributes settings can be placed on the script tag. The rule inventory does not assume element attributes are the only source of configuration.
- List Nest and cross-page Inject setups cannot be fully verified from the current page. They are reported as `requires-verification`.
- Component instances are opaque unless the Designer is editing inside that component.
- The current MVP scans one page at a time.

## Documentation

- [Rule inventory](docs/finsweet-v2-rule-inventory.md)
- [Adding rules](docs/adding-rules.md)

## Disclaimer

Finsweet Attributes is a product of Finsweet. This project is an independent developer tool and is not endorsed by or affiliated with Finsweet.
