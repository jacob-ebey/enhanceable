import { type Child, html, useEnhancements } from "enhanceable";

import * as enhancements from "./todo.client.ts";

export function TodoList({ children }: { children: Child }) {
	const { addTodo } = useEnhancements(enhancements);

	return html`
    <button type="button" ${{ onclick: addTodo }}>
      Add Todo
    </button>
    <ul>
      ${children}
    </ul>
  `;
}

export function TodoItem({ children }: { children: Child }) {
	const { deleteTodo } = useEnhancements(enhancements);

	return html`
    <li>
      ${children}
      <button type="button" ${{ onclick: deleteTodo }}>
        Delete
      </button>
    </li>
  `;
}
