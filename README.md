# enhanceable

A lightweight library for building server-rendered components with client-side enhancements.

## Overview

`enhanceable` provides a simple yet powerful way to create web applications that combine server-side rendering with progressive client-side enhancements. It uses a familiar HTML template syntax and a hooks-based API to bridge the gap between server and client behavior.

## Features

- 🚀 **Server-side rendering** with hydration capabilities
- 🧩 **Component-based architecture** for reusable UI elements
- 🔄 **Seamless client-server bridge** with the `use client` directive and `useEnhancements()` hook
- 📝 **HTML template literals** for intuitive component authoring
- 🔌 **Zero client-side JavaScript by default** - add interactivity only where needed

## Installation

```bash
npm install enhanceable
```

## Basic Usage

### Creating Components

Components are simple functions that return HTML using the `html` template literal:

```ts
import { html } from "enhanceable";

export function Wrapper({ children }) {
  return html`
    <div class="wrapper">
      ${children}
    </div>
  `;
}
```

### Adding Client-Side Enhancements

1. Create your component with `useEnhancements()`:

```ts
// counter.ts
import { html, useEnhancements } from "enhanceable";
import * as enhancements from "./counter.client.ts";

export function Counter({ initialCount = 0 }) {
  const { handleIncrement } = useEnhancements(enhancements);

  return html`
    <button${{ onclick: handleIncrement }}>${initialCount}</button>
  `;
}
```

2. Define client-side behavior in a separate file:

```ts
// counter.client.ts
"use client";

export function handleIncrement(event: MouseEvent) {
  if (!event.target || !(event.target instanceof HTMLElement)) {
    throw new Error("invalid target");
  }
  event.target.textContent = "" + (Number(event.target.textContent) + 1);
}
```

### Rendering Your App

```ts
import { html, render } from "enhanceable";
import { Counter } from "./components/counter.ts";

export default {
  async fetch() {
    return new Response(
      await render(
        () => html`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>Enhanceable App</title>
            </head>
            <body>
              <h1>Counter Example</h1>
              <${Counter} ${{ initialCount: 1 }} />
            </body>
          </html>
        `
      ),
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }
    );
  },
};
```

## Advanced Features

### Dynamic Component Creation

You can dynamically create and hydrate components on the client:

```ts
// In a client-side file
import { html } from "enhanceable";
import { hydrate } from "enhanceable/dom";
import { TodoItem } from "./todo.ts";

export async function addTodo(event: MouseEvent) {
  const list = document.querySelector("ul");
  const newItem = hydrate(
    await html`<${TodoItem}>New Item</${TodoItem}>`
  );
  list.append(newItem);
}
```

### DOM Utilities

The `enhanceable/dom` module provides utilities for client-side DOM manipulation:

```ts
import { hydrate, next } from "enhanceable/dom";

// Find the next element matching a selector
const list = next(button, "ul");

// Hydrate a component for client-side use
const element = hydrate(htmlContent);
```

## API Reference

### Core

- `html` - Template literal tag for creating HTML content
- `render(template)` - Renders a template to HTML string
- `useEnhancements(module)` - Connects server components with client-side behavior

### DOM Utilities

- `hydrate(html)` - Converts HTML string to DOM elements with enhancements
- `next(element, selector)` - Finds the next element matching a selector
