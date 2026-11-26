import type { NormalizedElement, RuleHelpers, ScanSnapshot } from './types';

const CMS_LIST_TYPES = new Set(['DynamoList', 'DynamoWrapper']);
const STATIC_HOST_TYPES = new Set([
  'DOM',
  'BlockElement',
  'Section',
  'Container',
  'ListElement',
  'ListItemElement',
  'DivBlock',
]);

function shortId(id: string): string {
  return id.slice(-6);
}

export function createHelpers(snapshot: ScanSnapshot): RuleHelpers {
  const attr = (element: NormalizedElement, name: string) =>
    element.attributes.find((candidate) => candidate.name === name.toLowerCase());

  const attrValue = (element: NormalizedElement, name: string) => {
    const found = attr(element, name);
    return found && !found.bound ? found.value : null;
  };

  const byAttr = (name: string, value?: string) => {
    const elements = snapshot.attributeIndex.get(name.toLowerCase()) ?? [];
    if (value === undefined) return elements;
    return elements.filter((element) => attrValue(element, name) === value);
  };

  const children = (element: NormalizedElement) =>
    element.childIds
      .map((id) => snapshot.byId.get(id))
      .filter((candidate): candidate is NormalizedElement => Boolean(candidate));

  const descendants = (element: NormalizedElement) => {
    const output: NormalizedElement[] = [];
    const visited = new Set<string>([element.id]);
    const queue = children(element);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);
      output.push(current);
      queue.push(...children(current));
    }

    return output;
  };

  const ancestors = (element: NormalizedElement) => {
    const output: NormalizedElement[] = [];
    const visited = new Set<string>([element.id]);
    let parentId = element.parentId;

    while (parentId && !visited.has(parentId)) {
      const parent = snapshot.byId.get(parentId);
      if (!parent) break;
      visited.add(parent.id);
      output.push(parent);
      parentId = parent.parentId;
    }

    return output;
  };

  const ancestor = (
    element: NormalizedElement,
    predicate: (candidate: NormalizedElement) => boolean
  ) => ancestors(element).find(predicate) ?? null;

  const instanceOf = (element: NormalizedElement, namespace: 'fs-list' | 'fs-inject' = 'fs-list') => {
    const name = `${namespace}-instance`;
    for (const candidate of [element, ...ancestors(element)]) {
      const value = attrValue(candidate, name);
      if (value) return value;
    }
    return '__root__';
  };

  const inScope = (
    element: NormalizedElement,
    scope: string,
    namespace: 'fs-list' | 'fs-inject' = 'fs-list'
  ) => instanceOf(element, namespace) === scope;

  const label = (element: NormalizedElement) => {
    const kind = element.tag ? `<${element.tag}>` : element.type;
    return element.displayName?.trim() || `${kind} · ${shortId(element.id)}`;
  };

  const breadcrumb = (element: NormalizedElement) => [
    ...ancestors(element)
      .reverse()
      .map((candidate) => label(candidate)),
    label(element),
  ];

  const isCollectionItemHost = (element: NormalizedElement) =>
    element.type === 'DynamoItem' || attrValue(element, 'fs-list-element') === 'item';

  const isForm = (element: NormalizedElement) => element.type === 'FormForm';

  const isSelect = (element: NormalizedElement) => element.type === 'FormSelect';

  const isCheckboxOrRadio = (element: NormalizedElement) =>
    element.type === 'FormCheckboxInput' || element.type === 'FormRadioInput';

  const isSlider = (element: NormalizedElement) => element.type === 'SliderWrapper';

  const isTabs = (element: NormalizedElement) => element.type === 'TabsWrapper';

  const isLinkLike = (element: NormalizedElement) =>
    element.type === 'Link' ||
    element.type === 'FormButton' ||
    element.type === 'DropdownLink' ||
    (element.type === 'DOM' && ['a', 'button'].includes(element.tag?.toLowerCase() ?? ''));

  const isCmsListHost = (element: NormalizedElement) => CMS_LIST_TYPES.has(element.type);

  const isStaticListHost = (element: NormalizedElement) =>
    STATIC_HOST_TYPES.has(element.type) || element.type === 'ComponentInstance';

  return {
    attr,
    attrValue,
    byAttr,
    children,
    descendants,
    ancestor,
    ancestors,
    instanceOf,
    inScope,
    label,
    breadcrumb,
    isCollectionItemHost,
    isForm,
    isSelect,
    isCheckboxOrRadio,
    isSlider,
    isTabs,
    isLinkLike,
    isCmsListHost,
    isStaticListHost,
  };
}
