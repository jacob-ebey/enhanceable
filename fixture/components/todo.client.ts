"use client";

import { html } from "enhanceable";
import { hydrate, next } from "enhanceable/dom";

import { TodoItem } from "./todo.ts";

export function deleteTodo(event: MouseEvent) {
	if (!event.target || !(event.target instanceof Element)) return;
	event.target.closest("li")?.remove();
}

export async function addTodo(event: MouseEvent) {
	if (!event.target || !(event.target instanceof Element)) return;
	const list = next(event.target, "ul");
	if (!list) throw new Error("No list found to add todo to.");
	const newItem = hydrate(
		await html`
      <${TodoItem}>New Item</${TodoItem}>
    `,
	);
	list.append(newItem);
}
