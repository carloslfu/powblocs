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

export function pngEncoderDecoderPrompt() {
  return `## Encode and decode a PNG file

To encode and/or decode a PNG file use the "npm:pngjs" library. Here is an example of how to use it to parse a PNG file:

\`\`\`ts
import { PNG } from "npm:pngjs";

const png = new PNG({
  filterType: 4,
});

png.parse(inputPath);

// You can now access the pixels array and dimensions
const { width, height } = png;
const pixels = png.data;
\`\`\``;
}

export function checkingFileIsPngPrompt() {
  return `## Check if a file is a PNG

To check if a file is a PNG use the "npm:is-png" library. Here is an example of how to use it:

\`\`\`ts
import { readChunk } from "npm:read-chunk";
import isPng from "npm:is-png";

const buffer = await readChunk('unicorn.png', {length: 8});

isPng(buffer);
//=> true
\`\`\``;
}

export function denoAPIsPrompt() {
  return `## Deno APIs

To use Deno APIs, you can use the \`Deno\` object. Here is an example of how to use it:

\`\`\`ts
await Deno.writeFile(outputPath, icoBuffer);
\`\`\`

The standard library is used for example like this:

\`\`\`ts
import { readAll } from "https://deno.land/std@0.184.0/streams/mod.ts";

const fileStream = await Deno.open(inputPath);
const buffer = await readAll(fileStream);
\`\`\``;
}
