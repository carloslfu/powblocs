import { basename, extname, join } from "https://deno.land/std/path/mod.ts";
import { ensureDir, exists } from "https://deno.land/std/fs/mod.ts";
import { readChunk } from "npm:read-chunk";
import isPng from "npm:is-png";
import pngToIco from "npm:png-to-ico";
import { PNG } from "npm:pngjs";

// Utility functions
async function getPngDimensions(
  filePath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    const fileStream = Deno.openSync(filePath);

    png.on("parsed", function () {
      fileStream.close();
      resolve({ width: this.width, height: this.height });
    });

    png.on("error", (err) => {
      fileStream.close();
      reject(err);
    });

    png.parse(fileStream);
  });
}

async function createTempDir(): Promise<string> {
  const tempDir = join(await Pow.dirPath("cache"), "png-to-ico-temp");
  await ensureDir(tempDir);
  return tempDir;
}

// Action Implementations
Pow.registerAction("selectFile", async () => {
  try {
    // Open file picker dialog
    const file = await Deno.open(Pow.actionData.filePath);
    const stat = await file.stat();
    file.close();

    const filePath = Pow.actionData.filePath;
    const fileName = basename(filePath);
    const fileSize = stat.size;

    // Get PNG dimensions
    const dimensions = await getPngDimensions(filePath);

    Pow.returnValue({
      filePath,
      fileName,
      fileSize,
      dimensions,
    });
  } catch (error) {
    Pow.returnValue({
      error: `Failed to select file: ${error.message}`,
    });
  }
});

Pow.registerAction("validatePngFile", async () => {
  try {
    const { filePath } = Pow.actionData;

    // Check if file exists
    if (!(await exists(filePath))) {
      return Pow.returnValue({
        isValid: false,
        message: "File does not exist",
      });
    }

    // Check if it's a PNG
    const buffer = await readChunk(filePath, { length: 8 });
    const isPngFile = isPng(buffer);

    if (!isPngFile) {
      return Pow.returnValue({
        isValid: false,
        message: "File is not a valid PNG image",
      });
    }

    // Check dimensions
    const dimensions = await getPngDimensions(filePath);
    if (dimensions.width > 256 || dimensions.height > 256) {
      return Pow.returnValue({
        isValid: false,
        message: "PNG dimensions must not exceed 256x256 pixels",
      });
    }

    Pow.returnValue({
      isValid: true,
      message: "File is valid and ready for conversion",
    });
  } catch (error) {
    Pow.returnValue({
      isValid: false,
      message: `Validation failed: ${error.message}`,
    });
  }
});

Pow.registerAction("convertToIco", async () => {
  try {
    const { inputPath, outputPath } = Pow.actionData;

    // Report progress
    Pow.send("progress", {
      percent: 0,
      stage: "Starting conversion",
    });

    // Validate input file
    const validation = await Pow.callAction("validatePngFile", {
      filePath: inputPath,
    });
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Create temporary directory
    const tempDir = await createTempDir();

    Pow.send("progress", {
      percent: 30,
      stage: "Converting to ICO format",
    });

    // Convert to ICO
    const icoBuffer = await pngToIco(inputPath);

    Pow.send("progress", {
      percent: 70,
      stage: "Saving ICO file",
    });

    // Write the output file
    await Deno.writeFile(outputPath, icoBuffer);

    Pow.send("progress", {
      percent: 100,
      stage: "Conversion complete",
    });

    Pow.returnValue({
      success: true,
      message: "Conversion completed successfully",
      outputPath,
    });
  } catch (error) {
    Pow.returnValue({
      success: false,
      message: `Conversion failed: ${error.message}`,
      outputPath: null,
    });
  }
});

Pow.registerAction("getSaveLocation", async () => {
  try {
    const { defaultFileName } = Pow.actionData;
    const documentsDir = await Pow.dirPath("document");
    const defaultPath = join(documentsDir, defaultFileName);

    // In a real implementation, this would use a native file save dialog
    // For now, we'll just return a path in the documents directory
    Pow.returnValue({
      filePath: defaultPath,
      canceled: false,
    });
  } catch (error) {
    Pow.returnValue({
      filePath: null,
      canceled: true,
    });
  }
});

Pow.registerAction("cleanupTempFiles", async () => {
  try {
    const tempDir = await createTempDir();

    // Remove all files in temp directory
    for await (const entry of Deno.readDir(tempDir)) {
      await Deno.remove(join(tempDir, entry.name));
    }

    // Remove temp directory itself
    await Deno.remove(tempDir);

    Pow.returnValue({
      success: true,
    });
  } catch (error) {
    Pow.returnValue({
      success: false,
    });
  }
});
