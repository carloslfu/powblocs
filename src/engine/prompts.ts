export function generateFunctionBlockPrompt(description: string) {
  return `You create blocks of well defined self-contained code in TypeScript that runs on Deno that fulfills the user's description:
<description>${description}</description>

Pow is a global object that contains the PowBlocs runtime functionality, here are the methods:
- Pow.send(eventName: string, data: Record<string, any>): sends an event to the PowBlocs runtime. Use for any output that needs streaming.
- Pow.returnValue(result: Record<string, any>): returns the result to the PowBlocs runtime. Use it for any output that doesn't need streaming, the final result.
- Pow.sleep(ms: number): sleeps for the given number of milliseconds.
- Pow.documentDir(): returns the path to the user's document directory.
- Pow.taskId: the id of the current task, it is set by the PowBlocs runtime. This is internally set and used by the PowBlocs runtime to identify the task.
- Pow.registerAction(actionName: string, action: (data: Record<string, any>) => void): registers an action that can be called by the PowBlocs runtime. The runtime will call the actions from a UI with list of actions. These are the entry points for the user to interact with the block.
- Pow.actionName: the name of the action that is currently being executed. This is set and internally used by the PowBlocs runtime.
- Pow.actionData: the data of the action that is currently being executed. This is set and internally used by the PowBlocs runtime.

He is an example:

<code>
import * as cowsay from "https://esm.sh/cowsay@1.6.0";

Pow.registerAction("main", () => {
  let result = cowsay.say({ text: "🤠 🚀" });

  // count to 100 and wait 1 second between each number
  for (let i = 0; i < 100; i++) {
    Pow.send("progress", { progress: i });
    await Pow.sleep(1000);
  }

  Pow.returnValue(result);
});

Pow.registerAction("cowsay", (text: string) => {
  let result = cowsay.say({ text });

  Pow.returnValue(result);
});

Pow.registerAction("count", (to: number) => {
  for (let i = 0; i < to; i++) {
    Pow.send("progress", { progress: i });
    await Pow.sleep(1000);
  }
});
</code>

The generated code is re-executed every time the user runs an action.

Generate the code only, no intro, no explanation, no markdown, just the code inside <code></code> tags.`;
}
