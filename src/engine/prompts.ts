export function generateFunctionBlockPrompt(description: string) {
  return `Generate TypeScript code that runs on Deno that fulfills the following description:
<description>${description}</description>

Put all of the code in a single function and run it.

At the end use \`RuntimeExtension.returnValue(result)\`, where result is the value you want to return. He is an example:

<code>
import * as cowsay from "https://esm.sh/cowsay@1.6.0";

function sayHello() {
  return cowsay.say({ text: "🤠 🚀" });
}

RuntimeExtension.returnValue(result);
</code>

Generate the code only, no intro, no explanation, no markdown, just the code inside <code></code> tags.`;
}
