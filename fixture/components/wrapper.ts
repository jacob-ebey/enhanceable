import { html } from "enhanceable";

export function Wrapper({ children }: { children: any }) {
  return html` <div class="wrapper">${children}</div> `;
}
