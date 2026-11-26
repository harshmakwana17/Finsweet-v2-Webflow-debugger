import type { DesignerClient, ElementRef } from '../webflow/designer-client';
import type { FixPlan, ScanSnapshot } from './types';

export interface FixResult {
  ok: boolean;
  message: string;
}

export async function applyFix(
  client: DesignerClient,
  snapshot: ScanSnapshot,
  fix: FixPlan,
  rescan: () => Promise<ScanSnapshot>
): Promise<FixResult> {
  for (const precondition of fix.preconditions) {
    if (!precondition.check(snapshot)) {
      return { ok: false, message: `Fix precondition failed: ${precondition.description}` };
    }
  }

  try {
    for (const operation of fix.operations) {
      const element = snapshot.byId.get(operation.elementId);
      if (!element) {
        throw new Error(`Element is no longer available: ${operation.elementId}`);
      }
      const ref = element.raw as ElementRef;
      if (operation.kind === 'set') {
        await client.setAttribute(ref, operation.name, operation.value ?? '');
      } else {
        await client.removeAttribute(ref, operation.name);
      }
    }

    await rescan();
    await client.notify(`Applied fix: ${fix.title}`, 'success');
    return { ok: true, message: `Applied fix: ${fix.title}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await client.notify(`Fix failed: ${message}`, 'error');
    return { ok: false, message: `Fix failed: ${message}` };
  }
}
