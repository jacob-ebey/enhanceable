import { html, useEnhancements } from "enhanceable";

import * as enhancements from "./counter.client.ts";

type CounterProps = {
	initialCount?: number;
};

export function Counter({ initialCount = 0 }: CounterProps) {
	const { handleIncrement } = useEnhancements(enhancements);

	return html`
    <button${{ onclick: handleIncrement }}>${initialCount}</button>
  `;
}
