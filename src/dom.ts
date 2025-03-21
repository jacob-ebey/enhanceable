import { RenderContextStorage } from "./context/browser.ts";
import type { UnsafeHTML } from "./lib/html.ts";

export function hydrate(html: UnsafeHTML): DocumentFragment {
	const template = document.createElement("template");
	template.innerHTML = html.value;
	const context = RenderContextStorage.getStore();
	if (!context.functions) {
		throw new Error("Context does not support hydration");
	}

	const content = template.content;

	for (const element of content.querySelectorAll("[data-hydrate]")) {
		element.removeAttribute("data-hydrate");
		for (const attribute of element.attributes) {
			if (attribute.name.startsWith("data-hydrate-")) {
				const event = attribute.name
					.slice("data-hydrate-".length)
					.replace(/^on/, "");
				const listener = context.functions.referenceById.get(attribute.value);
				if (typeof listener !== "function") {
					throw new Error(
						`No function found for event "${event} ${attribute.value}`,
					);
				}

				element.addEventListener(
					event as keyof ElementEventMap,
					listener as (this: Element, ev: Event) => any,
				);
				element.removeAttribute(attribute.name);
			}
		}
	}

	return content;
}

export function next(from: Element, selector: string): Element | null {
	// Start with the next sibling
	let element = from.nextElementSibling;

	// If no selector provided, return the immediate next sibling
	if (!selector) {
		return element;
	}

	// Check each sibling until we find a match or run out of siblings
	while (element) {
		if (element.matches?.(selector)) {
			return element;
		}
		element = element.nextElementSibling;
	}

	return null;
}
