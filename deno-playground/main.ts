import { walk } from "jsr:@std/fs";

async function findFolders() {
  const rootPath = "/Users/carlosgalarza/Projects";
  const matchingFolders = [];

  try {
    for await (const entry of walk(rootPath, {
      maxDepth: 3,
      includeDirs: true,
      includeFiles: false,
    })) {
      const folderName = entry.name.toLowerCase();
      if (
        folderName.includes("interpretability") ||
        folderName.includes("observability")
      ) {
        matchingFolders.push(entry.path);
      }
    }
  } catch (error) {
    console.error("Error accessing directory:", error);
  }

  return matchingFolders;
}

const result = await findFolders();
console.log("result", result);
