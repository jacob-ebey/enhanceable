import { RenderContextStorage } from "enhanceable/context";

const WS_CHARS = { " ": 1, "\t": 1, "\n": 1, "\r": 1 } as const;
const ESCAPE_REGEX = /[&<>"']/;
const ESCAPE_MAP = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export class UnsafeHTML {
	constructor(public value: string) {}
	toString() {
		return this.value;
	}
}

export function unsafe(html: string): UnsafeHTML {
	return new UnsafeHTML(html);
}

export type Attributes = Record<
	string,
	Function | string | number | boolean | null | undefined
>;
export type Component<T = any> = (props: T) => Child | Promise<Child>;
export type Child =
	| string
	| number
	| boolean
	| null
	| undefined
	| UnsafeHTML
	| Attributes
	| Component
	| (Child | Promise<Child>)[];

export async function html(
	strings: TemplateStringsArray,
	...values: (Child | Promise<Child>)[]
): Promise<UnsafeHTML> {
	if (!strings.length) return unsafe("");

	const firstValue = await values[0];
	const chunks = [
		typeof firstValue === "function"
			? strings[0].replace(/\<\s*$/, "")
			: strings[0],
	];
	const renderStack: [string[], Function, any][] = [];
	let skipAttributes = false;
	let toClean = 0 | 1 | 2;

	// Inline these functions for better V8 optimization
	const currentBuffer = () =>
		renderStack.length === 0 ? chunks : renderStack[renderStack.length - 1][0];
	const pushChunk = (chunk: string) => currentBuffer().push(chunk);

	const cleanNextString = (nextString: string, nextValue: unknown) => {
		if (toClean === 1) {
			const length = nextString.length;
			nextString = nextString.replace(/^\s*\>/, "");
			if (nextString.length !== length) toClean = 0;
		} else if (toClean === 2) {
			const length = nextString.length;
			nextString = nextString.replace(/^\s*\/\>/, "");
			if (nextString.length !== length) toClean = 0;
		}
		return typeof nextValue === "function"
			? nextString.replace(/\<\s*$/, "")
			: nextString;
	};

	for (let i = 0; i < values.length; i++) {
		const value = await values[i];
		const nextString = strings[i + 1] || "";
		let skipPush = false;

		if (typeof value === "function") {
			const buffer = currentBuffer();
			const lastChars = getNonWhitespaceChars(buffer, buffer.length - 1, 2, -1);

			if (lastChars === "</") {
				const toRender = renderStack.pop();
				if (!toRender) throw new Error("Unmatched closing tag");
				const [children, fn, props] = toRender;
				pushChunk(
					await fn({
						...props,
						children: new UnsafeHTML(children.join("").replace(/\<\/\s*$/, "")),
					}),
				);
				toClean = 1;
			} else {
				const nextChars = getNonWhitespaceChars(strings, i + 1, 2, 1);
				const isSelfClosing = nextChars === "/>";
				toClean = isSelfClosing ? 2 : 1;

				const nextValue = await values[i + 1];

				const trimmedNextChunk = (strings[i + 2] ?? "").trim();
				const hasProps = (skipAttributes =
					(trimmedNextChunk[0] === ">" || trimmedNextChunk.startsWith("/>")) &&
					typeof nextValue === "object" &&
					nextValue !== null);

				const props = hasProps ? nextValue : {};

				if (isSelfClosing) {
					pushChunk(await flattenChildren(value(props)));
				} else {
					renderStack.push([
						[cleanNextString(nextString, nextValue)],
						value,
						props,
					]);
					skipPush = true;
				}
			}
		} else if (typeof value === "object" && !Array.isArray(value)) {
			if (value === null) {
				// Do nothing
			} else if (value instanceof UnsafeHTML) {
				pushChunk(value.value);
			} else {
				if (!skipAttributes) {
					pushChunk(await renderAttributes(value));
				} else {
					skipAttributes = false;
				}
			}
		} else {
			const flat = await flattenChildren(value);
			if (flat.length > 0) {
				pushChunk(flat);
			}
		}

		if (!skipPush) {
			pushChunk(cleanNextString(nextString, await values[i + 1]));
		}
	}

	while (renderStack.length > 0) {
		const [children, fn, props] = renderStack.pop() ?? [[], null, {}];
		if (!fn) throw new Error("Invalid function");

		pushChunk(
			await fn({
				...props,
				children: new UnsafeHTML(children.join("").replace(/\<\/\s*$/, "")),
			}),
		);
	}

	return new UnsafeHTML(chunks.join(""));
}

async function flattenChildren(
	children: Child | Promise<Child>,
): Promise<string> {
	children = await children;
	if (children == null || typeof children === "boolean") return "";
	if (children instanceof UnsafeHTML) return children.value;
	if (typeof children !== "object") return escapeHTML(String(children));

	const chunks: string[] = [];
	const stack: (Child | Promise<Child>)[] = [children];

	while (stack.length > 0) {
		const child = await stack.pop();
		if (Array.isArray(child)) {
			// Push in reverse order for correct processing
			for (let i = child.length - 1; i >= 0; i--) {
				stack.push(child[i]);
			}
		} else if (child != null && typeof child !== "boolean") {
			if (child instanceof UnsafeHTML) {
				chunks.push(child.value);
			} else if (typeof child !== "object") {
				chunks.push(escapeHTML(String(child)));
			}
		}
	}

	return chunks.join("");
}

function escapeHTML(str: string): string {
	// Fast path for strings without special characters
	return !ESCAPE_REGEX.test(str)
		? str
		: str.replace(
				/[&<>"']/g,
				(ch) => ESCAPE_MAP[ch as keyof typeof ESCAPE_MAP],
			);
}

async function renderAttributes(attrs: Record<string, any>): Promise<string> {
	let result = "";

	let needsHydration = false;
	for (const key in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, key) || key === "children")
			continue;

		const value = await attrs[key];
		if (value === false || value == null) continue;

		if (typeof value === "function") {
			const context = RenderContextStorage.getStore();
			if (!context?.functions) {
				throw new Error(
					"Functions are not allowed in attributes in this environment.",
				);
			}
			let id = context.functions.idByReference.get(value);
			if (!id) {
				id = crypto.randomUUID();
				context.functions.idByReference.set(value, id);
			}
			if (!context.functions.referenceById.has(id)) {
				context.functions.referenceById.set(id, value);
			}
			result += `data-hydrate-${key}="${id}"`;
			needsHydration = true;
			continue;
		}

		if (value === true) {
			result += ` ${key}`;
		} else if (value instanceof UnsafeHTML) {
			result += ` ${key}="${value.value}"`;
		} else {
			result += ` ${key}="${escapeHTML(String(value))}"`;
		}
	}

	if (needsHydration) {
		result += ` data-hydrate`;
	}

	return result;
}

function getNonWhitespaceChars(
	strings: ArrayLike<string>,
	startIndex: number,
	numberOfChars: number,
	direction: 1 | -1,
): string {
	const result: string[] = [];
	let remaining = numberOfChars;
	let i = startIndex;
	const endIdx = direction > 0 ? strings.length : -1;

	while (i !== endIdx && remaining > 0) {
		const str = strings[i];
		if (!str) {
			i += direction;
			continue;
		}

		const strLen = str.length;
		const charStart = direction > 0 ? 0 : strLen - 1;
		const charEnd = direction > 0 ? strLen : -1;

		for (let j = charStart; j !== charEnd && remaining > 0; j += direction) {
			const ch = str[j];
			if (!WS_CHARS[ch as keyof typeof WS_CHARS]) {
				direction < 0 ? result.unshift(ch) : result.push(ch);
				remaining--;
			}
		}

		i += direction;
	}

	return result.join("");
}
