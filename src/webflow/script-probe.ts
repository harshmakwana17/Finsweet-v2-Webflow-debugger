import type { ScanSnapshot } from '../core/types';

export interface ScriptCheck {
  available: boolean;
  sources: string[];
  note: string;
}

export function describeScriptAccess(snapshot: ScanSnapshot): ScriptCheck {
  return {
    available: snapshot.scriptAccess === 'available' && snapshot.scriptEvidence.length > 0,
    sources: snapshot.scriptEvidence,
    note:
      snapshot.scriptAccess === 'available'
        ? 'Readable custom code was exposed by the Designer API for this page.'
        : 'Custom code is not exposed reliably through the Designer API. Verify the script in Webflow page settings.',
  };
}
