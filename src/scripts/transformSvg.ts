import { transformSvgToComponent } from '../utils/svgToComponent';

async function main() {
  try {
    await transformSvgToComponent({
      inputPath: 'src/components/ui/basma-transformed.svg',
      outputPath: 'src/components/ui/BasmaLogo.tsx',
      componentName: 'BasmaLogo',
    });
  } catch (error) {
    console.error('Failed to transform SVG:', error);
    process.exit(1);
  }
}

void main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
