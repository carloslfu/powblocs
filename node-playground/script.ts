import fs from "node:fs";
import path from "node:path";
import ytdl from "@distube/ytdl-core";
import cp from "node:child_process";
import readline from "node:readline";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import process from "node:process";

console.log("ffmpegPath", ffmpegPath);

if (!ffmpegPath) {
  throw new Error(
    "FFmpeg not found. Please install FFmpeg and set the path correctly."
  );
}

/**
 * Downloads and combines a YouTube video with audio using @distube/ytdl-core and FFmpeg.
 * @param {string} url - The YouTube video URL.
 * @param {string} outputPath - The directory to save the downloaded video.
 * @returns {Promise<string>} - Resolves with the path of the downloaded video.
 */
async function downloadVideo(url: string, outputPath: string): Promise<string> {
  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL");
  }

  // Get video info
  const info = await ytdl.getInfo(url);

  const title = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, "-"); // Sanitize title
  const filePath = path.resolve(outputPath, `${title}.mp4`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`File already exists: ${filePath}`);
    return filePath;
  }

  const tracker = {
    start: Date.now(),
    audio: { downloaded: 0, total: Infinity },
    video: { downloaded: 0, total: Infinity },
    merged: { frame: 0, speed: "0x", fps: 0 },
  };

  // Get audio and video streams
  const audio = ytdl(url, { quality: "highestaudio" }).on(
    "progress",
    (_, downloaded, total) => {
      tracker.audio = { downloaded, total };
    }
  );
  const video = ytdl(url, { quality: "highestvideo" }).on(
    "progress",
    (_, downloaded, total) => {
      tracker.video = { downloaded, total };
    }
  );

  // Prepare the progress bar
  let progressbarHandle: any | null = null;
  const progressbarInterval = 1000;
  const showProgress = () => {
    readline.cursorTo(process.stdout, 0);
    const toMB = (i: number) => (i / 1024 / 1024).toFixed(2);

    process.stdout.write(
      `Audio  | ${(
        (tracker.audio.downloaded / tracker.audio.total) *
        100
      ).toFixed(2)}% processed `
    );
    process.stdout.write(
      `(${toMB(tracker.audio.downloaded)}MB of ${toMB(
        tracker.audio.total
      )}MB).${" ".repeat(10)}\n`
    );

    process.stdout.write(
      `Video  | ${(
        (tracker.video.downloaded / tracker.video.total) *
        100
      ).toFixed(2)}% processed `
    );
    process.stdout.write(
      `(${toMB(tracker.video.downloaded)}MB of ${toMB(
        tracker.video.total
      )}MB).${" ".repeat(10)}\n`
    );

    process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
    process.stdout.write(
      `(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${" ".repeat(
        10
      )}\n`
    );

    process.stdout.write(
      `running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(
        2
      )} Minutes.`
    );
    readline.moveCursor(process.stdout, 0, -3);
  };

  // Start the ffmpeg child process
  const ffmpegProcess = cp.spawn(
    ffmpegPath as any,
    [
      // Remove ffmpeg's console spamming
      "-loglevel",
      "8",
      "-hide_banner",
      // Redirect/Enable progress messages
      "-progress",
      "pipe:3",
      // Set inputs
      "-i",
      "pipe:4",
      "-i",
      "pipe:5",
      // Map audio & video from streams
      "-map",
      "0:a",
      "-map",
      "1:v",
      // Keep encoding
      "-c:v",
      "copy",
      // Define output file
      filePath,
    ],
    {
      windowsHide: true,
      stdio: [
        /* Standard: stdin, stdout, stderr */
        "inherit",
        "inherit",
        "inherit",
        /* Custom: pipe:3, pipe:4, pipe:5 */
        "pipe",
        "pipe",
        "pipe",
      ],
    }
  );

  return new Promise((resolve, reject) => {
    try {
      ffmpegProcess.on("close", () => {
        console.log("\nDone");
        // Cleanup
        process.stdout.write("\n\n\n\n");
        if (progressbarHandle) clearInterval(progressbarHandle);
        resolve(filePath);
      });

      console.log("ffmpegProcess.stdio", ffmpegProcess.stdio);

      // Link streams
      // FFmpeg creates the transformer streams and we just have to insert / read data
      ffmpegProcess.stdio[3]?.on("data", (chunk) => {
        // Start the progress bar
        if (!progressbarHandle)
          progressbarHandle = setInterval(showProgress, progressbarInterval);
        // Parse the param=value list returned by ffmpeg
        const lines = chunk.toString().trim().split("\n");
        const args: { [key: string]: string } = {};
        for (const l of lines) {
          const [key, value] = l.split("=");
          args[key.trim()] = value.trim();
        }
        (tracker as any).merged = args;
      });

      audio.pipe(ffmpegProcess.stdio[4] as NodeJS.WritableStream);
      video.pipe((ffmpegProcess.stdio as any)[5]);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const [youtubeURL, outputDir] = args;

    if (!youtubeURL) {
      console.error(
        "Error: no YouTube URL provided. Usage: npx tsx script.ts <YouTube_URL> [output_directory]"
      );
      process.exit(1);
    }

    const outputDirectory = outputDir || ".";

    // Ensure output directory exists
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
      console.log(`Created directory: ${outputDirectory}`);
    }

    const downloadedVideoPath = await downloadVideo(
      youtubeURL,
      outputDirectory
    );

    console.log("Video downloaded successfully to", downloadedVideoPath);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
