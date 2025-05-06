import fs from 'fs';
import path from 'path';

function formatSVGPath(pathContent: string): string {
  // Split the path content into individual paths
  const paths = pathContent.match(/<path[^>]*>/g) || [];

  return paths
    .map((path) => {
      // Extract attributes
      const d = path.match(/d="([^"]*)"/)?.[1];
      const fill = path.match(/fill="([^"]*)"/)?.[1];

      if (!d || !fill) return path;

      // Format the path with proper indentation
      return `  <path\n    d="${d}"\n    fill="${fill}"\n  />`;
    })
    .join('\n');
}

function processSVGFile(inputPath: string, outputPath: string) {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(inputPath, 'utf8');

    // Extract the SVG content between the opening and closing tags
    const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    if (!svgMatch) {
      console.error('No SVG content found in the file');
      return;
    }

    const svgAttributes = svgContent.match(/<svg[^>]*>/)?.[0] || '';
    const pathsContent = svgMatch[1];

    // Format the paths
    const formattedPaths = formatSVGPath(pathsContent);

    // Create the new SVG content
    const newSVGContent = `${svgAttributes}\n${formattedPaths}\n</svg>`;

    // Write the formatted content to the output file
    fs.writeFileSync(outputPath, newSVGContent);
    console.log(`Successfully formatted SVG and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error processing SVG file:', error);
  }
}

// Example usage
const inputFile = path.join(__dirname, '../src/components/ui/bismillah.svg');
const outputFile = path.join(__dirname, '../src/components/ui/bismillah.formatted.svg');

processSVGFile(inputFile, outputFile);
