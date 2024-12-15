import { createAnthropic } from "@ai-sdk/anthropic";
import { generateHTML, JSONContent } from "@tiptap/react";
import { textEditorExtensions } from "@/components/TextEditor";
import { generateObject, generateText, LanguageModelV1 } from "ai";
import { fetch } from "@tauri-apps/plugin-http";
import TurndownService from "turndown";
import { z } from "zod";

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";
import { generateFunctionBlockPrompt } from "./prompts";

export const actionSchema = z.array(
  z.object({
    name: z.string().describe("The name of the action"),
    description: z.string().describe("The description of the action"),
    inputSchema: z
      .record(z.any())
      .describe("The input schema that the action accepts"),
    outputSchema: z
      .record(z.any())
      .describe("The output schema that the action returns"),
    eventsSchema: z
      .record(z.string(), z.any())
      .describe("The events schema that the action emits"),
  })
);

export type ActionSchema = z.infer<typeof actionSchema>;

export class PowBlocksEngine {
  store: CodeStore;

  turndownService = new TurndownService();

  private model: LanguageModelV1;
  private smallModel: LanguageModelV1;

  constructor({ store, apiKeys }: { store: CodeStore; apiKeys: APIKeys }) {
    this.store = store;

    this.turndownService = new TurndownService();

    const anthropic = createAnthropic({
      apiKey: apiKeys.ANTHROPIC_API_KEY,
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
      },
      fetch: async (input, init) => {
        return fetch(input, init);
      },
    });

    this.model = anthropic("claude-3-5-sonnet-20241022");
    this.smallModel = anthropic("claude-3-5-haiku-latest");
  }

  async updateOrCreateBlock(
    description: JSONContent,
    blockId?: string
  ): Promise<Block> {
    const htmlContent = generateHTML(description, textEditorExtensions);
    const markdownContent = this.turndownService.turndown(htmlContent);

    const [backendCodeResponse, titleResponse] = await Promise.all([
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 8192,
        prompt: generateFunctionBlockPrompt(markdownContent),
      }),
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 100,
        prompt: `Generate a short, descriptive title (3-5 words) for this code block based on this description:
<description>${markdownContent}</description>

Output the title only. Output it in the following format:
<title>Title</title>`,
      }),
    ]);

    // extract the code from the text
    let backendCode = backendCodeResponse.text.match(
      /<code>([\s\S]*?)<\/code>/
    )?.[1];

    if (!backendCode) {
      backendCode = `console.log('Error: No code generated')
Pow.returnValue('Error: No code generated');`;
    }

    let title = titleResponse.text.match(/<title>([\s\S]*?)<\/title>/)?.[1];

    let trimmedTitle = title?.trim() || "Untitled";

    /**
     * Generate actions for the block. An API for the visual layer to interact with the block.
     */
    const actionsResult = await generateObject({
      model: this.smallModel,
      prompt: `Generate actions for the block. An API for the visual layer to interact with the block.

The block description is:
<description>${markdownContent}</description>

The block title is:
<title>${trimmedTitle}</title>

The block code is:
<code>${backendCode}</code>

Output the actions in the following format. Pay attention to the actions input schema (schema). If the action doesn't need any input, set the schema to an empty object. If not, set the schema to the correct schema. For instance:

<code>
Pow.registerAction("main", async () => {
  let result: string = cowsay.say({ text: "🤠 🚀" });

  // count to 100 and wait 1 second between each number
  for (let i = 0; i < 100; i++) {
    Pow.send("progress", { progress: i });
    await Pow.sleep(1000);
  }

  Pow.returnValue({ result });
});

Pow.registerAction("cowsay", async ({ text }: { text: string }) => {
  let result = cowsay.say({ text });

  Pow.returnValue({ result });
});

Pow.registerAction("count", async ({ to }: { to: number }) => {
  for (let i = 0; i < to; i++) {
    Pow.send("progress", { progress: i });
    await Pow.sleep(1000);
  }
});
</code>

<actions>
{
  "actions": [
    {
      "name": "main",
      "description": "Main action that runs the default behavior",
      "inputSchema": {},
      "outputSchema": {
        "result": "string"
      },
      "eventsSchema": {
        "progress": {
          "progress": "number"
        }
      }
    },
    {
      "name": "cowsay",
      "description": "Makes the cow say something",
      "inputSchema": {
        "text": "string"
      },
      "outputSchema": {
        "result": "string"
      },
      "eventsSchema": {}
    },
    {
      "name": "count",
      "description": "Counts up to a number with progress events",
      "inputSchema": {
        "to": "number"
      },
      "outputSchema": {},
      "eventsSchema": {
        "progress": {
          "progress": "number"
        }
      }
    }
  ]
}
</actions>
`,
      schema: z.object({
        actions: actionSchema,
      }),
      maxTokens: 8192,
    });

    const actions = actionsResult.object.actions;

    const uiCodeResponse = await generateText({
      model: this.model,
      temperature: 0,
      maxTokens: 8192,
      prompt: `Generate the React UI code for the block.

The block description is:
<description>${markdownContent}</description>

The block title is:
<title>${trimmedTitle}</title>

The backend exposes the following actions:
<actions>${JSON.stringify(actions, null, 2)}</actions>

There are global hooks and functions that you can use to listen to events and state changes, and to fire actions:
- Pow.useEvent(eventName, (data) => {
  // do something
})
- const result = Pow.useActionResult(actionName, (data) => {
  // do something
})
- Pow.runAction(actionName, input)

Output UI like it is going to be rendered in react-runner. Output it in the following format:
<uiCode>
import { useState } from 'react';

function App() {
  const [text, setText] = useState('');
  const [countTo, setCountTo] = useState(10);

  // Get result from cowsay action
  const result = Pow.useActionResult('cowsay');

  // Track progress from count action
  const [progress, setProgress] = useState(0);
  Pow.useEvent('progress', (data) => {
    setProgress(data.progress);
  });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{Pow.title}</h2>

      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h3 className="font-bold mb-2">Cowsay</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              className="border p-2 rounded"
              placeholder="Enter text for cow"
            />
            <button
              onClick={() => Pow.runAction('cowsay', { text })}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Make cow say
            </button>
          </div>
          {result && <pre className="mt-2 font-mono">{result.result}</pre>}
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-bold mb-2">Counter</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={countTo}
              onChange={e => setCountTo(parseInt(e.target.value))}
              className="border p-2 rounded"
            />
            <button
              onClick={() => Pow.runAction('count', { to: countTo })}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Start counting
            </button>
          </div>
          <div className="mt-2">
            Progress: {progress}
          </div>
        </div>
      </div>
    </div>
  );
}
</uiCode>`,
    });

    let uiCode = uiCodeResponse.text.match(/<uiCode>([\s\S]*?)<\/uiCode>/)?.[1];

    if (!uiCode) {
      uiCode = `console.log('Error: No UI code generated')
Pow.returnValue('Error: No UI code generated');`;
    }

    if (blockId) {
      await this.store.updateBlock(blockId, {
        description,
        backendCode,
        title: trimmedTitle,
        actions,
        uiCode,
      });

      return {
        id: blockId,
        description,
        backendCode,
        title: trimmedTitle,
        actions,
        uiCode,
      };
    }

    return this.store.createBlock({
      description,
      backendCode,
      title: trimmedTitle,
      actions,
      uiCode,
    });
  }
}
