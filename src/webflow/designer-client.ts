import type { NormalizedAttribute } from '../core/types';

export interface ElementRef {
  id: string | { component: string; element: string };
  type: string;
}

export interface PageInfo {
  id: string;
  name: string;
}

export type DesignerEvent = 'currentpage' | 'selectedelement' | 'currentappmode';

export interface DesignerClient {
  getPageInfo(): Promise<PageInfo>;
  getAllElements(): Promise<ElementRef[]>;
  getRootElement(): Promise<ElementRef | null>;
  getChildren(element: ElementRef): Promise<ElementRef[]>;
  getDisplayName(element: ElementRef): Promise<string | null>;
  getTag(element: ElementRef): Promise<string | null>;
  getAttributes(element: ElementRef): Promise<NormalizedAttribute[]>;
  setAttribute(element: ElementRef, name: string, value: string): Promise<void>;
  removeAttribute(element: ElementRef, name: string): Promise<void>;
  getCollectionPaginationEnabled(element: ElementRef): Promise<boolean | null>;
  getCustomCodeSources(): Promise<string[]>;
  setSelectedElement(element: ElementRef): Promise<void>;
  subscribe(
    event: DesignerEvent,
    callback: (...args: unknown[]) => void
  ): () => void;
  notify(message: string, type: 'success' | 'error' | 'information'): Promise<void>;
}

type LooseElement = any;

function getWebflow(): any {
  const wf = (globalThis as unknown as { webflow?: any }).webflow;
  if (!wf) {
    throw new Error(
      'Webflow Designer API is unavailable. Open this extension inside the Webflow Designer.'
    );
  }
  return wf;
}

export function elementId(element: ElementRef): string {
  if (typeof element.id === 'string') return element.id;
  return `${element.id.component}:${element.id.element}`;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function asElement(element: ElementRef): LooseElement {
  return element as LooseElement;
}

function isBinding(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'sourceType' in value;
}

export function createWebflowDesignerClient(): DesignerClient {
  const webflow = getWebflow();

  const client: DesignerClient = {
    async getPageInfo() {
      const page = await webflow.getCurrentPage();
      const id = typeof page?.id === 'string' ? page.id : String(page?.id ?? 'current-page');
      return { id, name: await page.getName() };
    },

    async getAllElements() {
      return (await webflow.getAllElements()) as ElementRef[];
    },

    async getRootElement() {
      return (await webflow.getRootElement()) as ElementRef | null;
    },

    async getChildren(element) {
      const el = asElement(element);
      if (!el.children || typeof el.getChildren !== 'function') return [];
      return (await el.getChildren()) as ElementRef[];
    },

    async getDisplayName(element) {
      const el = asElement(element);
      if (!el.displayName || typeof el.getDisplayName !== 'function') return null;
      return await el.getDisplayName();
    },

    async getTag(element) {
      const el = asElement(element);
      if (el.type !== 'DOM' || typeof el.getTag !== 'function') return null;
      const tag = await el.getTag();
      return typeof tag === 'string' ? tag : null;
    },

    async getAttributes(element) {
      const el = asElement(element);
      const output: NormalizedAttribute[] = [];

      if (el.attributes && typeof el.getResolvedAttributes === 'function') {
        const rawEntries: Array<{ name: unknown; value: unknown }> =
          typeof el.getAttributes === 'function' ? await el.getAttributes() : [];
        const resolvedEntries: Array<{ name: unknown; value: unknown }> =
          await el.getResolvedAttributes();

        const resolvedByName = new Map<string, string | null>();
        for (const entry of resolvedEntries) {
          if (typeof entry.name !== 'string') continue;
          resolvedByName.set(normalizeName(entry.name), typeof entry.value === 'string' ? entry.value : null);
        }

        for (const entry of rawEntries) {
          let sourceName = typeof entry.name === 'string' ? entry.name : null;
          let name = sourceName ? normalizeName(sourceName) : null;

          if (!name && resolvedEntries.length === 1 && typeof resolvedEntries[0].name === 'string') {
            sourceName = resolvedEntries[0].name as string;
            name = normalizeName(sourceName);
          }
          if (!name || !sourceName) continue;

          const nameBound = isBinding(entry.name);
          const valueBound = isBinding(entry.value);
          const rawValue = typeof entry.value === 'string' ? entry.value : null;
          const value = rawValue ?? resolvedByName.get(name) ?? null;

          output.push({
            name,
            sourceName,
            value: value === null ? null : value.trim(),
            bound: nameBound || valueBound,
            unresolved: value === null && (nameBound || valueBound),
          });
        }

        const seen = new Set(output.map((attribute) => attribute.name));
        for (const entry of resolvedEntries) {
          if (typeof entry.name !== 'string') continue;
          const name = normalizeName(entry.name);
          if (seen.has(name)) continue;
          output.push({
            name,
            sourceName: entry.name,
            value: typeof entry.value === 'string' ? entry.value.trim() : null,
            bound: false,
            unresolved: typeof entry.value !== 'string',
          });
        }

        return output;
      }

      if (el.customAttributes && typeof el.getAllCustomAttributes === 'function') {
        const entries = await el.getAllCustomAttributes();
        for (const entry of entries ?? []) {
          if (typeof entry.name !== 'string') continue;
          output.push({
            name: normalizeName(entry.name),
            sourceName: entry.name,
            value: typeof entry.value === 'string' ? entry.value.trim() : null,
            bound: false,
            unresolved: false,
          });
        }
      }

      return output;
    },

    async setAttribute(element, name, value) {
      const el = asElement(element);
      if (el.attributes && typeof el.setAttribute === 'function') {
        await el.setAttribute(name, value);
        return;
      }
      if (el.customAttributes && typeof el.setCustomAttribute === 'function') {
        await el.setCustomAttribute(name, value);
        return;
      }
      throw new Error(`Element ${elementId(element)} does not support attribute writes.`);
    },

    async removeAttribute(element, name) {
      const el = asElement(element);
      if (el.attributes && typeof el.removeAttribute === 'function') {
        await el.removeAttribute(name);
        return;
      }
      if (el.customAttributes && typeof el.removeCustomAttribute === 'function') {
        await el.removeCustomAttribute(name);
        return;
      }
      throw new Error(`Element ${elementId(element)} does not support attribute removal.`);
    },

    async getCollectionPaginationEnabled(element) {
      const el = asElement(element);
      if (!['DynamoWrapper', 'DynamoList'].includes(el.type)) return null;
      if (typeof el.getSettings !== 'function') return null;
      try {
        const settings = await el.getSettings();
        if (!('pagination' in settings)) return null;
        return Boolean(settings.pagination);
      } catch {
        return null;
      }
    },

    async getCustomCodeSources() {
      const elements = (await webflow.getAllElements()) as ElementRef[];
      const sources: string[] = [];

      for (const ref of elements) {
        const el = asElement(ref);
        if (!['CustomCode', 'HtmlEmbed'].includes(el.type)) continue;

        try {
          const settings =
            typeof el.searchSettings === 'function'
              ? await el.searchSettings({ valueType: 'code' })
              : null;
          if (settings) {
            for (const value of Object.values(settings) as any[]) {
              if (typeof value?.value === 'string') sources.push(value.value);
              else if (typeof value?.resolvedValue === 'string') sources.push(value.resolvedValue);
            }
          }

          if (sources.length === 0 && typeof el.getResolvedSettings === 'function') {
            const resolved = await el.getResolvedSettings();
            for (const value of Object.values(resolved)) {
              if (typeof value === 'string' && /<script|@finsweet\/attributes/i.test(value)) {
                sources.push(value);
              }
            }
          }
        } catch {
          // Code settings are beta; failure means manual script verification.
        }
      }

      return sources;
    },

    async setSelectedElement(element) {
      await webflow.setSelectedElement(element);
    },

    subscribe(event, callback) {
      try {
        return webflow.subscribe(event, callback) as () => void;
      } catch {
        return () => undefined;
      }
    },

    async notify(message, type) {
      if (typeof webflow.notify !== 'function') return;
      await webflow.notify({ message, type });
    },
  };

  return client;
}
