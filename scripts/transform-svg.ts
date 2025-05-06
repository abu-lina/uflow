import { svgToReact } from './svg-to-react.ts'

async function transformSVGs() {
  // Transform Bismillah SVG
  await svgToReact({
    inputPath: 'src/components/ui/basma-transformed.svg',
    outputPath: 'src/components/ui/BasmaLogo.tsx',
    componentName: 'BasmaLogo',
  });
}

transformSVGs().catch(console.error); 