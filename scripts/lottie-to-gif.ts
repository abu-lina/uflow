/**
 * Script to convert Lottie JSON files to GIF using Puppeteer
 * 
 * This script:
 * 1. Reads a Lottie JSON file
 * 2. Renders frames using Puppeteer (headless browser)
 * 3. Converts frames to GIF
 * 
 * Usage: npx tsx scripts/lottie-to-gif.ts <file-path> [output-path]
 * Example: npx tsx scripts/lottie-to-gif.ts "imports/lottie/animation.json" "public/animations/animation.gif"
 */

import * as fs from 'fs';
import * as path from 'path';

// Check if required packages are available
let puppeteer: any;
let sharp: any;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('❌ Error: puppeteer not found. Installing...');
  console.log('   Run: npm install --save-dev puppeteer');
  process.exit(1);
}

try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Error: sharp not found. Installing...');
  console.log('   Run: npm install --save-dev sharp');
  process.exit(1);
}

interface LottieData {
  w?: number;
  h?: number;
  fr?: number;
  ip?: number;
  op?: number;
  [key: string]: unknown;
}

async function convertLottieToGif(
  inputPath: string,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    fps?: number;
    quality?: number;
  } = {}
): Promise<void> {
  console.log(`\n🎬 Converting Lottie to GIF\n`);
  console.log(`📂 Input: ${inputPath}`);
  console.log(`📂 Output: ${outputPath}\n`);

  // Read and parse JSON
  let lottieData: LottieData;
  try {
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    lottieData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error: Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Get original dimensions
  const originalWidth = lottieData.w || 1920;
  const originalHeight = lottieData.h || 1080;
  
  // Limit dimensions for GIF (GIF format has size limitations)
  // Scale down if too large, maintaining aspect ratio
  const maxDimension = 800; // Max width or height
  let canvasWidth = options.width || originalWidth;
  let canvasHeight = options.height || originalHeight;
  
  if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
    const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight);
    canvasWidth = Math.round(canvasWidth * scale);
    canvasHeight = Math.round(canvasHeight * scale);
    console.log(`⚠️  Scaling down to ${canvasWidth}x${canvasHeight} for GIF compatibility\n`);
  }
  
  const fps = options.fps || lottieData.fr || 30;
  const frameRate = fps;
  const startFrame = lottieData.ip || 0;
  const endFrame = lottieData.op || 60;
  
  // Limit frame count for GIF (too many frames can cause issues)
  const maxFrames = 300;
  let totalFrames = endFrame - startFrame;
  let frameStep = 1;
  
  if (totalFrames > maxFrames) {
    frameStep = Math.ceil(totalFrames / maxFrames);
    totalFrames = Math.ceil(totalFrames / frameStep);
    console.log(`⚠️  Sampling frames (every ${frameStep} frames) to limit to ${totalFrames} frames\n`);
  }
  
  const quality = options.quality || 10;

  console.log(`📐 Canvas: ${canvasWidth} x ${canvasHeight}`);
  console.log(`🎞️  Frames: ${startFrame} to ${endFrame} (${totalFrames} frames)`);
  console.log(`⚡ FPS: ${frameRate}`);
  console.log(`🎨 Quality: ${quality}\n`);

  // Launch browser
  console.log('🌐 Launching browser...\n');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: originalWidth, height: originalHeight });

    // Create HTML page with Lottie
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${originalWidth}px;
      height: ${originalHeight}px;
      overflow: hidden;
    }
    #lottie-container {
      width: ${originalWidth}px;
      height: ${originalHeight}px;
    }
  </style>
</head>
<body>
  <div id="lottie-container"></div>
  <script>
    const animationData = ${JSON.stringify(lottieData)};
    const animation = lottie.loadAnimation({
      container: document.getElementById('lottie-container'),
      renderer: 'canvas',
      loop: false,
      autoplay: false,
      animationData: animationData,
    });
    
    window.animation = animation;
    window.animationReady = false;
    
    animation.addEventListener('DOMLoaded', () => {
      window.animationReady = true;
    });
  </script>
</body>
</html>`;

    await page.setContent(htmlContent);

    // Wait for animation to load
    await page.waitForFunction(() => (window as any).animationReady === true, { timeout: 10000 });
    console.log('✅ Animation loaded, rendering frames...\n');

    // Collect all frame buffers
    const frameBuffers: Buffer[] = [];

    // Render each frame (with step if needed)
    let frameIndex = 0;
    for (let frame = startFrame; frame <= endFrame; frame += frameStep) {
      // Go to frame
      await page.evaluate((f) => {
        (window as any).animation.goToAndStop(f, true);
      }, frame);

      // Wait a bit for render
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Capture screenshot as buffer
      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: originalWidth, height: originalHeight },
      });

      // Resize if needed using sharp
      if (canvasWidth !== originalWidth || canvasHeight !== originalHeight) {
        const resized = await sharp(screenshot)
          .resize(canvasWidth, canvasHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        frameBuffers.push(resized);
      } else {
        frameBuffers.push(screenshot as Buffer);
      }

      frameIndex++;
      if (frameIndex % 10 === 0 || frame >= endFrame) {
        const progress = Math.round((frameIndex / totalFrames) * 100);
        process.stdout.write(`\r⏳ Progress: ${progress}% (${frameIndex}/${totalFrames} frames)`);
      }
    }

    console.log('\n\n✅ Rendering complete, encoding GIF...\n');

    // Create animated GIF using sharp
    // Adjust delay based on frame step to maintain original timing
    const delay = Math.round((1000 / frameRate) * frameStep);
    
    // Save frames as temporary files (sharp needs file paths for animated GIFs)
    const tempDir = path.join(path.dirname(outputPath), '.temp-gif-frames');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFiles: string[] = [];
    for (let i = 0; i < frameBuffers.length; i++) {
      const tempFile = path.join(tempDir, `frame-${i.toString().padStart(4, '0')}.png`);
      fs.writeFileSync(tempFile, frameBuffers[i]);
      tempFiles.push(tempFile);
    }

    // Combine frames into animated GIF using sharp
    // Resize frames if needed and optimize for GIF
    const combinedGif = await sharp(tempFiles, {
      animated: true,
      limitInputPixels: false,
    })
      .resize(canvasWidth, canvasHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .gif({
        delay: delay,
        loop: 0,
        colours: 256, // Limit colors for smaller file size
      })
      .toBuffer();

    // Clean up temp files and directory
    tempFiles.forEach((file) => {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.warn(`Warning: Could not delete temp file ${file}`);
      }
    });

    // Remove temp directory recursively
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Warning: Could not delete temp directory ${tempDir}`);
    }

    // Write GIF file
    fs.writeFileSync(outputPath, combinedGif);

    console.log(`✅ GIF saved: ${outputPath}\n`);
    console.log(`📊 File size: ${(combinedGif.length / 1024 / 1024).toFixed(2)} MB\n`);
    console.log('✨ Conversion complete!\n');
  } finally {
    await browser.close();
  }
}

// Main execution
const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error('❌ Error: Input file path is required');
  console.log('\nUsage: npx tsx scripts/lottie-to-gif.ts <input-path> [output-path]');
  console.log('Example: npx tsx scripts/lottie-to-gif.ts "imports/lottie/animation.json" "public/animations/animation.gif"\n');
  process.exit(1);
}

// Resolve absolute paths
const resolvedInputPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(resolvedInputPath)) {
  console.error(`❌ Error: Input file not found: ${resolvedInputPath}`);
  process.exit(1);
}

// Determine output path
let resolvedOutputPath: string;
if (outputPath) {
  resolvedOutputPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath);
} else {
  // Default: same directory, .gif extension
  const inputDir = path.dirname(resolvedInputPath);
  const inputName = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
  resolvedOutputPath = path.join(inputDir, `${inputName}.gif`);
}

// Create output directory if it doesn't exist
const outputDir = path.dirname(resolvedOutputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

convertLottieToGif(resolvedInputPath, resolvedOutputPath);
