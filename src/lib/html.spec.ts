import { expect, it } from "vitest";
import { html, unsafe } from "./html.ts";

it("should return an empty string for an empty template", async () => {
	expect((await html``).toString()).toBe("");
});

it("should correctly escape interpolated string values", async () => {
	// Insert a string that contains special characters
	const result =
		await html`<p class="style">Hello, ${"<b>world</b>"}!</p>after`;
	// The inserted string is HTML-escaped to prevent script injection.
	expect(result.toString()).toBe(
		'<p class="style">Hello, &lt;b&gt;world&lt;/b&gt;!</p>after',
	);
});

it("should render attribute-spread objects correctly", async () => {
	const attributes = {
		class: "btn",
		"data-value": '<script>alert("x");</script>',
	};
	// The attribute value is escaped by escapeHTML.
	const result = await html`<button${attributes}></button>`;
	// Expected to have a leading space before each attribute.
	const expected = `<button class="btn" data-value="&lt;script&gt;alert(&quot;x&quot;);&lt;/script&gt;"></button>`;
	expect(result.toString()).toBe(expected);
});

it("should handle array interpolations by joining all elements", async () => {
	const items = [html`<li>Item1</li>`, "b"];
	const result = await html`<ul>${items}</ul>`;
	expect(result.toString()).toBe("<ul><li>Item1</li>b</ul>");
});

it("should process component interpolation correctly (normal branch)", async () => {
	// Define a sample component function that returns a known string.
	const myComponent = () => "componentContent";
	// Template parts: before and after the interpolation.
	const result = await html`<span><${myComponent}/></span>`;
	// Expected: The component is rendered between <span> and </span>.
	expect(result.toString()).toBe("<span>componentContent</span>");
});

it("should render unsafe content", async () => {
	const unsafeContent = "<script>alert('x');</script>";
	const result = await html`<div>${unsafe(unsafeContent)}</div>`;
	expect(result.toString()).toBe("<div><script>alert('x');</script></div>");
});

it("should render child content", async () => {
	const Component = ({ children }: { children: any }) =>
		html`<div class="wrapper">${children}</div>`;
	const result =
		await html`<${Component}>Child Content</${Component}>More Content`;
	expect(result.toString()).toBe(
		'<div class="wrapper">Child Content</div>More Content',
	);
});

it("can render multiple components", async () => {
	const Component = () => html`<button></button>`;
	const result =
		await html`First<${Component} ${{ initialCount: 1 }} />Second<${Component} ${{ initialCount: 2 }}></${Component}>Third`;
	const withoutWhitespace = result.toString().replace(/\s+/, "");
	expect(withoutWhitespace).toBe(
		"First<button></button>Second<button></button>Third",
	);
});
