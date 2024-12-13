export function generateFunctionBlockPrompt(description: string) {
  return `You create blocks of well defined self-contained code in TypeScript that runs on Deno that fulfills the user's description:
<description>${description}</description>

Put all of the code in a single function and run it.

At the end use \`Pow.returnValue(result)\`, where result is the value you want to return. He is an example:

<code>
import * as cowsay from "https://esm.sh/cowsay@1.6.0";

let result = cowsay.say({ text: "🤠 🚀" });

// count to 100 and wait 1 second between each number
for (let i = 0; i < 100; i++) {
  Pow.emit("progress", { progress: i });
  await Pow.sleep(1000);
}

Pow.returnValue(result);
</code>

Pow is a global object that contains the PowBlocs runtime functionality, here are the methods:
- Pow.emit(eventName: string, data: Record<string, any>): emits an event to the PowBlocs runtime. Use for any output that needs streaming.
- Pow.returnValue(result: Record<string, any>): returns the result to the PowBlocs runtime. Use it for any output that doesn't need streaming, the final result.
- Pow.sleep(ms: number): sleeps for the given number of milliseconds.
- Pow.documentDir(): returns the path to the user's document directory.
- Pow.taskId: the id of the current task, it is set by the PowBlocs runtime.

Generate the code only, no intro, no explanation, no markdown, just the code inside <code></code> tags.`;
}
