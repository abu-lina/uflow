const fs = require('fs');

// Function to transform a single path element
function transformPath(pathString) {
  // Extract the id
  const idMatch = pathString.match(/id="([^"]+)"/);
  const id = idMatch ? idMatch[1] : '';

  // Remove the id from the original string
  let transformed = pathString.replace(/id="[^"]+"/, '').trim();

  // Add space before fill if it doesn't exist
  transformed = transformed.replace(/([^ ])fill=/, '$1 fill=');

  // Add the id at the end
  if (id) {
    transformed = transformed.replace(/>$/, ` id="${id}" />`);
  }

  return transformed;
}

// Function to process the entire SVG file
function processSVGFile(inputPath, outputPath) {
  try {
    // Read the input file
    const content = fs.readFileSync(inputPath, 'utf8');

    // Find all path elements
    const pathRegex = /<path[^>]+>/g;

    // Replace each path with its transformed version
    const transformedContent = content.replace(pathRegex, (match) => {
      return transformPath(match);
    });

    // Write the transformed content to the output file
    fs.writeFileSync(outputPath, transformedContent, 'utf8');

    console.log('SVG transformation completed successfully!');
    console.log(`Output written to: ${outputPath}`);
  } catch (error) {
    console.error('Error processing SVG file:', error);
  }
}

// Example usage
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.log('Usage: node transform-svg.js <input-file> <output-file>');
  process.exit(1);
}

processSVGFile(inputFile, outputFile);
