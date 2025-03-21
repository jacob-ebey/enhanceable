import { bench, boxplot, do_not_optimize, run, summary } from "mitata";

import { html } from "./html.ts";
import { render } from "./render.ts";

function HelloWorld() {
  return html`<h1>Hello World</h1>`;
}

function Counter({ count }: { count: number }) {
  return html`<h1>Counter ${count}</h1>`;
}

function NComponents({ size }: { size: number }) {
  return Array.from(
    { length: size },
    (_, i) => html`<${Counter} ${{ count: i + 1 }} />`,
  );
}

boxplot(() => {
  summary(() => {
    bench("hello-world", async () => {
      const unsafe = await html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Hello World</title>
          </head>
          <body>
            <h1>Hello World</h1>
          </body>
        </html>
      `;
      do_not_optimize(unsafe);
    });

    bench("hello-world render()", async () => {
      const unsafe = render(
        () => html`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Hello World</title>
            </head>
            <body>
              <h1>Hello World</h1>
            </body>
          </html>
        `,
      );
      do_not_optimize(unsafe);
    });
  });
  summary(() => {
    bench("hello-world-1", async () => {
      const unsafe = await html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Hello World</title>
          </head>
          <body>
            <${HelloWorld} />
          </body>
        </html>
      `;
      do_not_optimize(unsafe);
    });

    bench("hello-world-1 render()", async () => {
      const unsafe = await render(
        () => html`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Hello World</title>
            </head>
            <body>
              <${HelloWorld} />
            </body>
          </html>
        `,
      );
      do_not_optimize(unsafe);
    });
  });

  summary(() => {
    bench(
      "components ($size)",
      function* (state: { get(key: "size"): number }) {
        const size = state.get("size");
        yield async () => {
          const unsafe = await html`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Components</title>
              </head>
              <body>
                <${NComponents} ${{ size }} />
              </body>
            </html>
          `;

          do_not_optimize(unsafe);
        };
      },
    ).range("size", 1000, 100000);

    bench(
      "components ($size) render()",
      function* (state: { get(key: "size"): number }) {
        const size = state.get("size");
        yield async () => {
          const unsafe = await render(
            () => html`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Components</title>
                </head>
                <body>
                  <${NComponents} ${{ size }} />
                </body>
              </html>
            `,
          );

          do_not_optimize(unsafe);
        };
      },
    ).range("size", 1000, 100000);
  });
});

await run({ colors: false });
