import type {
  ElementCapabilities,
  NormalizedAttribute,
  NormalizedElement,
  ScanSnapshot,
} from './types';
import { elementId, type DesignerClient, type ElementRef } from '../webflow/designer-client';

function capabilitiesFor(raw: any): ElementCapabilities {
  return {
    attributes: raw?.attributes === true,
    customAttributes: raw?.customAttributes === true,
    children: raw?.children === true,
    displayName: raw?.displayName === true,
    domId: raw?.domId === true,
    settings: raw?.elementSettings === true || typeof raw?.getSettings === 'function',
  };
}

function cloneAttribute(attribute: NormalizedAttribute): NormalizedAttribute {
  return { ...attribute };
}

export async function scanDesigner(client: DesignerClient): Promise<ScanSnapshot> {
  const page = await client.getPageInfo();
  const allElements = await client.getAllElements();
  const rawById = new Map<string, ElementRef>();

  for (const element of allElements) {
    rawById.set(elementId(element), element);
  }

  const childIdsById = new Map<string, string[]>();
  const parentIdById = new Map<string, string | null>();
  const seen = new Set<string>();

  const registerRef = (element: ElementRef): string => {
    const id = elementId(element);
    if (!rawById.has(id)) rawById.set(id, element);
    return id;
  };

  const visit = async (element: ElementRef, parentId: string | null): Promise<void> => {
    const id = registerRef(element);
    if (seen.has(id)) return;
    seen.add(id);
    parentIdById.set(id, parentId);

    const children = await client.getChildren(element);
    const childIds = children.map(registerRef);
    childIdsById.set(id, childIds);

    for (const child of children) {
      await visit(child, id);
    }
  };

  const root = await client.getRootElement();
  if (root) {
    await visit(root, null);
  }

  for (const element of allElements) {
    const id = elementId(element);
    if (seen.has(id)) continue;
    await visit(element, null);
  }

  for (const [id, element] of rawById) {
    if (childIdsById.has(id)) continue;
    const children = await client.getChildren(element);
    childIdsById.set(
      id,
      children.map((child) => registerRef(child))
    );
  }

  const elements: NormalizedElement[] = [];
  for (const [id, raw] of rawById) {
    const capabilities = capabilitiesFor(raw);
    const attributes = capabilities.attributes || capabilities.customAttributes
      ? await client.getAttributes(raw)
      : [];

    elements.push({
      id,
      rawId: raw.id,
      raw,
      type: String((raw as any).type ?? 'Unknown'),
      tag: await client.getTag(raw),
      displayName: await client.getDisplayName(raw),
      attributes: attributes.map(cloneAttribute),
      parentId: parentIdById.get(id) ?? null,
      childIds: childIdsById.get(id) ?? [],
      capabilities,
    });
  }

  const byId = new Map(elements.map((element) => [element.id, element]));
  const attributeIndex = new Map<string, NormalizedElement[]>();

  for (const element of elements) {
    for (const attribute of element.attributes) {
      const key = attribute.name;
      const bucket = attributeIndex.get(key) ?? [];
      bucket.push(element);
      attributeIndex.set(key, bucket);
    }
  }

  let scriptSources: string[] = [];
  try {
    scriptSources = await client.getCustomCodeSources();
  } catch {
    scriptSources = [];
  }

  return {
    pageId: page.id,
    pageName: page.name,
    scannedAt: new Date().toISOString(),
    elements,
    byId,
    attributeIndex,
    scriptAccess: scriptSources.length > 0 ? 'available' : 'unavailable',
    scriptEvidence: scriptSources,
  };
}
