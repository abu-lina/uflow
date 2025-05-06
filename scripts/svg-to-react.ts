import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

interface SVGToReactOptions {
  inputPath: string;
  outputPath: string;
  componentName: string;
}

async function svgToReact({ inputPath, outputPath, componentName }: SVGToReactOptions) {
  // Read SVG file
  const svgContent = fs.readFileSync(inputPath, 'utf-8');

  // Extract SVG attributes and content
  const svgMatch = svgContent.match(/<svg([^>]*)>([\s\S]*)<\/svg>/);
  if (!svgMatch) throw new Error('Invalid SVG file');

  const [, attributes, content] = svgMatch;

  // Parse SVG attributes
  const attrs = attributes
    .match(/(\w+)=["']([^"']*)["']/g)
    ?.map((attr) => {
      const [key, value] = attr.split('=');
      return {
        key: key.trim(),
        value: value.replace(/["']/g, ''),
      };
    })
    .filter((attr) => !['xmlns', 'xmlns:xlink'].includes(attr.key));

  // Generate React component
  const componentContent = `
interface ${componentName}Props {
  className?: string;
  height?: number;
  width?: number;
}

export function ${componentName}({ className = '', height = 200, width = 200 }: ${componentName}Props) {
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="${attrs?.find((attr) => attr.key === 'viewBox')?.value || '0 0 200 200'}"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      ${content.trim()}
    </svg>
  );
}
`;

  // Format with Prettier
  const formattedContent = await prettier.format(componentContent, {
    parser: 'typescript',
    singleQuote: true,
    trailingComma: 'es5',
    printWidth: 100,
  });

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write formatted component
  fs.writeFileSync(outputPath, formattedContent);
  console.log(`Created ${componentName} component at ${outputPath}`);
}

// Example usage:
// svgToReact({
//   inputPath: 'path/to/input.svg',
//   outputPath: 'src/components/ui/MyComponent.tsx',
//   componentName: 'MyComponent',
// });

export { svgToReact };
