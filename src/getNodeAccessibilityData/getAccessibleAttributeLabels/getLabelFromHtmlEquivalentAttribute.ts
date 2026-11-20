import { getLocalName } from "../../getLocalName";
import { mapAttributeNameAndValueToLabel } from "./mapAttributeNameAndValueToLabel";

const isNotMatchingElement = ({
  elements,
  node,
}: {
  elements: string[];
  node: HTMLElement;
}) => elements.length && !elements.includes(getLocalName(node));

const isNotMatchingProperties = ({
  node,
  properties,
}: {
  node: HTMLElement;
  properties: { key: string; value: string }[];
}) =>
  properties.length &&
  !properties.some(({ key, value }) => node.getAttribute(key) === value);

// REFs:
// - https://www.w3.org/TR/html-aria/#docconformance-attr
// - https://www.w3.org/TR/html-aam-1.0/#html-attribute-state-and-property-mappings
const ariaToHTMLAttributeMapping: Record<
  string,
  Array<{
    elements?: string[];
    implicitMissingValue?: string;
    name: string;
    negative?: boolean;
    properties?: { key: string; value: string }[];
    value?: string;
  }>
> = {
  "aria-autocomplete": [
    { elements: ["form"], name: "autocomplete" },
    { elements: ["input", "select", "textarea"], name: "autocomplete" },
  ],
  "aria-checked": [
    // A checkbox or radio input is handled by getNativeCheckedValue.
    {
      value: "mixed",
      name: "indeterminate",
    },
  ],
  "aria-colspan": [{ elements: ["td", "th"], name: "colspan" }],
  "aria-controls": [
    {
      elements: ["input"],
      name: "list",
    },
  ],
  "aria-disabled": [
    {
      elements: ["button", "input", "optgroup", "option", "select", "textarea"],
      name: "disabled",
    },
    {
      // TODO: Form controls within a valid legend child element of a fieldset
      // with a disabled attribute do not become disabled.
      elements: ["fieldset"],
      name: "disabled",
    },
  ],

  // TODO: Set properties on the summary element.
  // REF: https://www.w3.org/TR/html-aam-1.0/#att-open-details
  // "aria-expanded": [{ elements: ["details"], name: "open" }],

  // TODO: Set properties on the dialog element.
  // REF: https://www.w3.org/TR/html-aam-1.0/#att-open-dialog

  // Not announced, indeed it will be hidden from the accessibility tree.
  // "aria-hidden": [{ name: "hidden" }],

  "aria-invalid": [
    // TODO: If the value doesn't match the pattern: aria-invalid="true";
    // Otherwise, aria-invalid="false"
    // REF: https://www.w3.org/TR/html-aam-1.0/#att-pattern
    // { elements: ["input"], name: "pattern" },
    // TODO: aria-invalid="spelling" or grammar
    // REF: https://www.w3.org/TR/html-aam-1.0/#att-spellcheck
    // { elements: ["input"], name: "spellcheck" },
  ],

  "aria-multiselectable": [{ elements: ["select"], name: "multiple" }],
  "aria-placeholder": [
    { elements: ["input", "textarea"], name: "placeholder" },
  ],
  "aria-valuemax": [
    { elements: ["input"], name: "max" },
    { elements: ["meter", "progress"], name: "max" },
  ],
  "aria-valuemin": [
    { elements: ["input"], name: "min" },
    { elements: ["meter", "progress"], name: "min" },
  ],
  "aria-valuenow": [{ elements: ["meter", "progress"], name: "value" }],
  "aria-readonly": [
    { elements: ["input", "textarea"], name: "readonly" },
    { name: "contenteditable", negative: true },
  ],
  "aria-required": [
    { elements: ["input", "select", "textarea"], name: "required" },
  ],
  "aria-rowspan": [{ elements: ["td", "th"], name: "rowspan" }],
  "aria-selected": [{ elements: ["option"], name: "selected" }],
};

const isNativeCheckable = (node: HTMLElement): node is HTMLInputElement =>
  getLocalName(node) === "input" &&
  ["checkbox", "radio"].includes((node as HTMLInputElement).type);

/**
 * The checked state of a checkbox or radio input is its `checked` property
 * (its checkedness), and a checkbox is "mixed" when its `indeterminate`
 * property is true. The `checked` content attribute only sets the initial
 * state: once the user toggles the input, or a script sets `checked`, the
 * attribute no longer reflects it. There is no `indeterminate` content
 * attribute. Browsers expose this native state and ignore `aria-checked` on
 * these inputs, which authors must not use there.
 *
 * REFs:
 * - https://html.spec.whatwg.org/multipage/input.html#concept-fe-checked
 * - https://www.w3.org/TR/html-aam-1.0/#el-input-checkbox
 * - https://www.w3.org/TR/html-aria/#el-input-checkbox
 */
const getNativeCheckedValue = (node: HTMLInputElement) =>
  node.type === "checkbox" && node.indeterminate
    ? "mixed"
    : String(node.checked);

export const getLabelFromHtmlEquivalentAttribute = ({
  attributeName,
  container,
  node,
}: {
  attributeName: string;
  container: Node;
  node: HTMLElement;
}): { label: string; value: string } => {
  const htmlAttribute = ariaToHTMLAttributeMapping[attributeName];

  if (attributeName === "aria-checked" && isNativeCheckable(node)) {
    const attributeValue = getNativeCheckedValue(node);
    const label = mapAttributeNameAndValueToLabel({
      attributeName,
      attributeValue,
      container,
      node,
    });

    return { label: label ?? "", value: attributeValue };
  }

  if (!htmlAttribute?.length) {
    return { label: "", value: "" };
  }

  for (const {
    elements = [],
    implicitMissingValue,
    name,
    negative = false,
    properties = [],
    value,
  } of htmlAttribute) {
    if (isNotMatchingElement({ elements, node })) {
      continue;
    }

    if (isNotMatchingProperties({ node, properties })) {
      continue;
    }

    const attributeValue = node.hasAttribute(name)
      ? value ?? node.getAttribute(name)!
      : node.hasAttribute(attributeName)
      ? null
      : implicitMissingValue ?? null;

    const label = mapAttributeNameAndValueToLabel({
      attributeName,
      attributeValue,
      container,
      negative,
      node,
    });

    if (label) {
      return { label, value: attributeValue ?? "" };
    }
  }

  return { label: "", value: "" };
};
