
import { basename, extname, join } from "https://deno.land/std/path/mod.ts";
import { ensureDir, exists } from "https://deno.land/std/fs/mod.ts";
import pngToIco from "npm:png-to-ico";
import { readChunk } from "npm:read-chunk";
import isPng from "npm:is-png";
import { PNG } from "npm:pngjs";

// Utility functions
async function getPngDimensions(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    const fileStream = Deno.openSync(filePath);
    
    png.on('parsed', function() {
      fileStream.close();
      resolve({ width: this.width, height: this.height });
    });

    png.on('error', (err) => {
      fileStream.close();
      reject(err);
    });

    png.parse(fileStream);
  });
}

async function validatePngDimensions(width: number, height: number): Promise<boolean> {
  // ICO files typically support sizes up to 256x256
  return width <= 256 && height <= 256 && width > 0 && height > 0;
}

async function createTempDirectory(): Promise<string> {
  const tempDir = join(await Pow.dirPath("cache"), "png-to-ico-temp");
  await ensureDir(tempDir);
  return tempDir;
}

// Action Implementations
Pow.registerAction("selectFile", async () => {
  try {
    // Simulate file picker dialog - in real implementation this would use native file picker
    const filePath = Pow.actionData.filePath;
    
    if (!await exists(filePath)) {
      throw new Error("File does not exist");
    }

    const fileInfo = await Deno.stat(filePath);
    const dimensions = await getPngDimensions(filePath);
    
    Pow.returnValue({
      filePath,
      fileName: basename(filePath),
      fileSize: fileInfo.size,
      dimensions
    });
  } catch (error) {
    Pow.returnValue({
      error: error.message
    });
  }
});

Pow.registerAction("validatePngFile", async ({ filePath }) => {
  try {
    // Check if file exists
    if (!await exists(filePath)) {
      return Pow.returnValue({
        isValid: false,
        message: "File does not exist"
      });
    }

    // Check if file is PNG
    const buffer = await readChunk(filePath, { length: 8 });
    if (!isPng(buffer)) {
      return Pow.returnValue({
        isValid: false,
        message: "File is not a valid PNG image"
      });
    }

    // Check dimensions
    const dimensions = await getPngDimensions(filePath);
    const isValidSize = await validatePngDimensions(dimensions.width, dimensions.height);

    if (!isValidSize) {
      return Pow.returnValue({
        isValid: false,
        message: "PNG dimensions must be between 1x1 and 256x256 pixels"
      });
    }

    Pow.returnValue({
      isValid: true,
      message: "File is valid and ready for conversion"
    });
  } catch (error) {
    Pow.returnValue({
      isValid: false,
      message: `Validation error: ${error.message}`
    });
  }
});

Pow.registerAction("convertToIco", async ({ inputPath, outputPath }) => {
  try {
    Pow.send("progress", { percent: 0, stage: "Starting conversion" });

    // Validate input file
    const validationResult = await Pow.actionData.validatePngFile({ filePath: inputPath });
    if (!validationResult.isValid) {
      throw new Error(validationResult.message);
    }

    Pow.send("progress", { percent: 20, stage: "Creating ICO file" });

    // Convert to ICO
    const icoBuffer = await pngToIco(inputPath);

    Pow.send("progress", { percent: 80, stage: "Saving file" });

    // Write the output file
    await Deno.writeFile(outputPath, icoBuffer);

    Pow.send("progress", { percent: 100, stage: "Conversion complete" });

    Pow.returnValue({
      success: true,
      message: "Conversion completed successfully"
    });
  } catch (error) {
    Pow.returnValue({
      success: false,
      message: `Conversion failed: ${error.message}`
    });
  }
});

Pow.registerAction("selectSaveLocation", async ({ defaultFileName }) => {
  try {
    // In a real implementation, this would use a native file save dialog
    // For this example, we'll use the downloads directory
    const downloadsDir = await Pow.dirPath("download");
    const filePath = join(downloadsDir, defaultFileName);

    Pow.returnValue({
      filePath,
      canceled: false
    });
  } catch (error) {
    Pow.returnValue({
      filePath: "",
      canceled: true
    });
  }
});

Pow.registerAction("cleanupCache", async () => {
  try {
    const tempDir = await createTempDirectory();
    
    // Remove all files in temp directory
    for await (const entry of Deno.readDir(tempDir)) {
      await Deno.remove(join(tempDir, entry.name));
    }

    // Remove temp directory itself
    await Deno.remove(tempDir);

    Pow.returnValue({
      success: true
    });
  } catch (error) {
    Pow.returnValue({
      success: false
    });
  }
});
