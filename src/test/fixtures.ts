import type { NormalizedAttribute } from '../core/types';
import type {
  DesignerClient,
  ElementRef,
  PageInfo,
} from '../webflow/designer-client';

export interface FakeElement extends ElementRef {
  attributes: boolean;
  customAttributes: boolean;
  children: boolean;
  displayName: boolean;
  elementSettings: boolean;
  attributeValues: Record<string, string | null>;
  childIds: string[];
  displayText?: string;
  tag?: string;
}

export interface FakeClientOptions {
  page?: PageInfo;
  scriptSources?: string[];
  selectedIds?: string[];
  notifications?: Array<{ message: string; type: string }>;
}

export function makeElement(
  id: string,
  type: string,
  options: {
    attrs?: Record<string, string | null>;
    children?: string[];
    displayName?: string;
    tag?: string;
    attributes?: boolean;
    customAttributes?: boolean;
  } = {}
): FakeElement {
  return {
    id,
    type,
    attributes: options.attributes ?? true,
    customAttributes: options.customAttributes ?? true,
    children: options.children !== undefined,
    displayName: options.displayName !== undefined,
    elementSettings: false,
    attributeValues: options.attrs ?? {},
    childIds: options.children ?? [],
    displayText: options.displayName,
    tag: options.tag,
  };
}

export function createFakeClient(elements: FakeElement[], options: FakeClientOptions = {}) {
  const byId = new Map(elements.map((element) => [String(element.id), element]));
  const root = elements[0] ?? null;
  const selectedIds = options.selectedIds ?? [];
  const notifications = options.notifications ?? [];
  const operations: string[] = [];

  function getElement(ref: ElementRef): FakeElement {
    const id = typeof ref.id === 'string' ? ref.id : `${ref.id.component}:${ref.id.element}`;
    const element = byId.get(id);
    if (!element) throw new Error(`Unknown fake element: ${id}`);
    return element;
  }

  function toAttributes(element: FakeElement): NormalizedAttribute[] {
    return Object.entries(element.attributeValues).map(([name, value]) => ({
      name: name.toLowerCase(),
      sourceName: name,
      value,
      bound: false,
      unresolved: false,
    }));
  }

  const client: DesignerClient = {
    async getPageInfo() {
      return options.page ?? { id: 'page-1', name: 'Test Page' };
    },
    async getAllElements() {
      return elements;
    },
    async getRootElement() {
      return root;
    },
    async getChildren(element) {
      return getElement(element).childIds
        .map((id) => byId.get(id))
        .filter((candidate): candidate is FakeElement => Boolean(candidate));
    },
    async getDisplayName(element) {
      return getElement(element).displayText ?? null;
    },
    async getTag(element) {
      return getElement(element).tag ?? null;
    },
    async getAttributes(element) {
      return toAttributes(getElement(element));
    },
    async setAttribute(element, name, value) {
      operations.push(`set:${name}:${value}`);
      getElement(element).attributeValues[name] = value;
    },
    async removeAttribute(element, name) {
      operations.push(`remove:${name}`);
      delete getElement(element).attributeValues[name];
    },
    async getCollectionPaginationEnabled() {
      return null;
    },
    async getCustomCodeSources() {
      return options.scriptSources ?? [];
    },
    async setSelectedElement(element) {
      selectedIds.push(String(element.id));
    },
    subscribe() {
      return () => undefined;
    },
    async notify(message, type) {
      notifications.push({ message, type });
    },
  };

  return { client, elements, byId, selectedIds, notifications, operations };
}
