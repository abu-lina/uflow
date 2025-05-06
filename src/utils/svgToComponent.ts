import fs from 'fs';
import path from 'path';

interface TransformOptions {
  inputPath: string;
  outputPath: string;
  componentName: string;
}

export async function transformSvgToComponent({
  inputPath,
  outputPath,
  componentName,
}: TransformOptions): Promise<void> {
  try {
    // Read the SVG file
    const svgContent = await fs.promises.readFile(inputPath, 'utf-8');

    // Extract paths and other SVG elements
    const paths = svgContent.match(/<path[^>]*>/g) || [];
    const otherElements = svgContent.match(/<(?!path)[^>]*>/g) || [];

    // Create the React component content
    const componentContent = `import React from 'react';

import { cn } from "@/lib/utils";

interface ${componentName}Props extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function ${componentName}({ className, ...props }: ${componentName}Props) {
  return (
    <svg
      className={cn("", className)}
      fill="none"
      height="65"
      viewBox="0 0 400 65"
      width="400"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      ${paths.join('\n      ')}
      ${otherElements.join('\n      ')}
    </svg>
  );
}
`;

    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Write the component file
    await fs.promises.writeFile(outputPath, componentContent, 'utf-8');

    console.log(`Successfully created ${componentName} component at ${outputPath}`);
  } catch (error) {
    console.error('Error transforming SVG to component:', error);
    throw error;
  }
}

// Example usage:
// transformSvgToComponent({
//   inputPath: 'path/to/input.svg',
//   outputPath: 'src/components/ui/MyLogo.tsx',
//   componentName: 'MyLogo'
// }); 