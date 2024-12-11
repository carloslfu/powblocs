import { createWriteStream } from "node:fs";
import ytdl from "npm:@distube/ytdl-core";
import { join } from "https://deno.land/std@0.205.0/path/mod.ts";

async function downloadVideo(url: string, outputPath: string): Promise<string> {
  if (!ytdl.validateURL(url)) throw new Error("Invalid YouTube URL");

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, "-");
  const filePath = join(outputPath, `${title}.mp4`);

  // Temporary files
  const audioPath = join(outputPath, `${title}_audio.webm`);
  const videoPath = join(outputPath, `${title}_video.webm`);

  // Download audio
  const audioReadable = ytdl(url, { quality: "highestaudio" });
  await streamToFile(audioReadable, audioPath);

  // Download video
  const videoReadable = ytdl(url, { quality: "highestvideo" });
  await streamToFile(videoReadable, videoPath);

  // Merge using ffmpeg
  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i",
      audioPath,
      "-i",
      videoPath,
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      filePath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const process = cmd.spawn();
  const { code } = await process.status;
  if (code !== 0) {
    const stderr = new TextDecoder().decode(await process.stderrOutput());
    throw new Error(`FFmpeg failed with code ${code}: ${stderr}`);
  }

  // Cleanup
  await Deno.remove(audioPath);
  await Deno.remove(videoPath);

  return filePath;
}

async function streamToFile(readable: NodeJS.ReadableStream, filePath: string) {
  const writeStream = createWriteStream(filePath);
  readable.pipe(writeStream);
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

async function main() {
  const [youtubeURL, outputDir = "."] = Deno.args;
  if (!youtubeURL) {
    console.error(
      "Usage: deno run --allow-net --allow-read --allow-write --allow-run script.ts <YouTube_URL> [output_directory]"
    );
    Deno.exit(1);
  }

  // Ensure output directory exists
  try {
    await Deno.mkdir(outputDir, { recursive: true });
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // Ignore if already exists
    } else {
      throw e;
    }
  }

  try {
    const downloadedVideoPath = await downloadVideo(youtubeURL, outputDir);
    console.log("Video downloaded successfully to", downloadedVideoPath);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (import.meta.main) {
  await main();
}
