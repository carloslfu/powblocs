import { Hono } from "https://deno.land/x/hono/mod.ts";
import React from "https://esm.sh/react";
import { renderToString } from "https://esm.sh/react-dom/server";

async function createServer() {
  const app = new Hono();
  let counter = 0;

  const port = await (async () => {
    for (let p = 3002; p < 4000; p++) {
      try {
        const listener = Deno.listen({ port: p });
        await listener.close();
        return p;
      } catch {
        continue;
      }
    }
    throw new Error("No free ports found");
  })();

  const App = ({ counter }: { counter: number }) =>
    React.createElement("div", null, [
      React.createElement("h1", null, `Counter: ${counter}`),
      React.createElement("button", { id: "increment" }, "Increment"),
    ]);

  app.get("/increment", (c) => {
    counter++;
    return c.json({ counter });
  });

  app.get("/", (c) => {
    const app = React.createElement(App, { counter });
    const html = renderToString(
      React.createElement("html", null, [
        React.createElement("head", null, [
          React.createElement("title", null, "Counter App"),
          React.createElement("script", {
            dangerouslySetInnerHTML: {
              __html: `window.__INITIAL_DATA__ = ${JSON.stringify({
                counter,
              })}`,
            },
          }),
          React.createElement("script", {
            type: "module",
            dangerouslySetInnerHTML: {
              __html: `
              import React from 'https://esm.sh/react';
              import { hydrateRoot } from 'https://esm.sh/react-dom/client';

              const App = ({ counter }) => {
                const [count, setCount] = React.useState(counter);

                const increment = async () => {
                  const response = await fetch('/increment');
                  const data = await response.json();
                  setCount(data.counter);
                };

                return React.createElement("div", null, [
                  React.createElement("h1", null, \`Counter: \${count}\`),
                  React.createElement("button", { onClick: increment }, "Increment")
                ]);
              };

              hydrateRoot(
                document.getElementById('root'),
                React.createElement(App, { counter: window.__INITIAL_DATA__.counter })
              );
            `,
            },
          }),
        ]),
        React.createElement(
          "body",
          null,
          React.createElement("div", { id: "root" }, app)
        ),
      ])
    );

    return c.html(html);
  });

  return { port, app };
}

const result = await createServer();

console.log(`Server running on port ${result.port}`);
Deno.serve({ port: result.port }, result.app.fetch);

// RuntimeExtension.returnValue(result);
