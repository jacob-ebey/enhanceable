import { html, render } from "enhanceable";

import { Counter } from "./components/counter.ts";
import { TodoItem, TodoList } from "./components/todo.ts";
import { Wrapper } from "./components/wrapper.ts";

export default {
  async fetch() {
    return new Response(
      await render(
        () => html`<!DOCTYPE html>
    				<html lang="en">
    					<head>
    						<meta charset="UTF-8">
    						<meta name="viewport" content="width=device-width, initial-scale=1.0">
    						<title>Document</title>
    					</head>
    					<body>
    					  <${Wrapper}>
      						<h1>Hello, World!</h1>
      						<p>First</p>
      						<${Counter} ${{ initialCount: 1 }} />
      						<p>Second</p>
      						<${Counter} ${{ initialCount: 2 }} />
      						<p>Third</p>
                  <${TodoList}>
                    <${TodoItem}>Item 1</${TodoItem}>
                    <${TodoItem}>Item 2</${TodoItem}>
                  </${TodoList}>
                </${Wrapper}>
    					</body>
    				</html>
    			`,
      ),
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      },
    );
  },
};
