export function pngToIcoPrompt() {
  return `# Transform a PNG file to an ICO file

To transform a PNG file to an ICO file use the "npm:png-to-ico" library. Here is an example of how to use it:

\`\`\`ts
import pngToIco from "npm:png-to-ico";

// Validate input is PNG
if (!(await isPNG(inputPath))) {
throw new Error("Input file must be a PNG image");
}

const outputFileName = basename(inputPath, extname(inputPath)) + ".ico";
const outputPath = join(outputDirectory, outputFileName);

// Convert PNG to ICO using the promise-based API
const icoBuffer = await pngToIco(inputPath);

// Write the ICO file using Deno's API
await Deno.writeFile(outputPath, icoBuffer);
\`\`\``;
}
