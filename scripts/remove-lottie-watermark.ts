/**
 * Script to remove watermarks from Lottie/After Effects JSON files
 * 
 * This script:
 * 1. Reads a Lottie JSON file
 * 2. Identifies watermark layers (by name or position)
 * 3. Creates a backup of the original file
 * 4. Removes watermark layers
 * 5. Saves the cleaned file
 * 
 * Usage: npx tsx scripts/remove-lottie-watermark.ts <file-path>
 * Example: npx tsx scripts/remove-lottie-watermark.ts "imports/lottie/animation.json"
 */

import * as fs from 'fs';
import * as path from 'path';

interface LottieLayer {
  nm?: string;
  ty?: number;
  ind?: number;
  ks?: {
    p?: {
      a?: number;
      k?: number[];
    };
  };
  layers?: LottieLayer[] | { [key: string]: LottieLayer };
  [key: string]: unknown;
}

interface LottieData {
  w?: number;
  h?: number;
  layers?: LottieLayer[] | { [key: string]: LottieLayer };
  assets?: { [key: string]: { layers?: LottieLayer[] | { [key: string]: LottieLayer } } };
  [key: string]: unknown;
}

interface RemovedLayer {
  name: string;
  type: number | undefined;
  path: string;
  reason: string;
}

function getPosition(layer: LottieLayer): { x: number; y: number } | null {
  if (!layer.ks || !layer.ks.p) return null;
  
  const p = layer.ks.p;
  if (p.a === 0 && p.k && Array.isArray(p.k) && p.k.length >= 2) {
    return { x: p.k[0], y: p.k[1] };
  }
  return null;
}

function isWatermarkByName(layer: LottieLayer): boolean {
  if (!layer.nm) return false;
  const nameLower = layer.nm.toLowerCase();
  return (
    nameLower.includes('watermark') ||
    nameLower.includes('figma') ||
    nameLower.includes('made with') ||
    nameLower.includes('made in') ||
    layer.nm === 'Group Layer 8'
  );
}

function isWatermarkByPosition(layer: LottieLayer, canvasWidth: number, canvasHeight: number): boolean {
  const position = getPosition(layer);
  if (!position) return false;
  
  // Check if in bottom-right corner (last 20% of width and height)
  return position.x > canvasWidth * 0.8 && position.y > canvasHeight * 0.8;
}

function removeLayerByName(
  layers: LottieLayer[] | { [key: string]: LottieLayer } | undefined,
  targetName: string,
  currentPath: string = '',
  removedLayers: RemovedLayer[] = []
): boolean {
  if (!layers) return false;
  
  const isArray = Array.isArray(layers);
  const layerArray = isArray ? layers : Object.values(layers);
  const keys = isArray ? null : Object.keys(layers);
  
  for (let i = 0; i < layerArray.length; i++) {
    const layer = layerArray[i];
    const layerName = layer.nm || `Layer ${i}`;
    const fullPath = currentPath ? `${currentPath} > ${layerName}` : layerName;
    
    if (layer.nm === targetName) {
      // Found the layer, remove it
      if (isArray) {
        layers.splice(i, 1);
      } else if (keys) {
        delete layers[keys[i]];
      }
      
      removedLayers.push({
        name: layerName,
        type: layer.ty,
        path: fullPath,
        reason: `Matched target name: ${targetName}`
      });
      
      return true;
    }
    
    // Recursively check children
    if (layer.layers) {
      if (removeLayerByName(layer.layers, targetName, fullPath, removedLayers)) {
        return true;
      }
    }
  }
  
  return false;
}

function removeWatermarkLayers(
  layers: LottieLayer[] | { [key: string]: LottieLayer } | undefined,
  canvasWidth: number,
  canvasHeight: number,
  currentPath: string = '',
  removedLayers: RemovedLayer[] = []
): void {
  if (!layers) return;
  
  const isArray = Array.isArray(layers);
  const layerArray = isArray ? layers : Object.values(layers);
  const keys = isArray ? null : Object.keys(layers);
  
  // Iterate backwards to safely remove items
  for (let i = layerArray.length - 1; i >= 0; i--) {
    const layer = layerArray[i];
    const layerName = layer.nm || `Layer ${i}`;
    const fullPath = currentPath ? `${currentPath} > ${layerName}` : layerName;
    
    let shouldRemove = false;
    let reason = '';
    
    // Check by name
    if (isWatermarkByName(layer)) {
      shouldRemove = true;
      reason = 'Contains watermark keywords in name';
    }
    // Check by position
    else if (isWatermarkByPosition(layer, canvasWidth, canvasHeight)) {
      shouldRemove = true;
      reason = 'Positioned in bottom-right corner (watermark area)';
    }
    
    if (shouldRemove) {
      // Remove from array/object
      if (isArray) {
        layers.splice(i, 1);
      } else if (keys) {
        delete layers[keys[i]];
      }
      
      removedLayers.push({
        name: layerName,
        type: layer.ty,
        path: fullPath,
        reason
      });
    } else {
      // Recursively check children
      if (layer.layers) {
        removeWatermarkLayers(layer.layers, canvasWidth, canvasHeight, fullPath, removedLayers);
      }
    }
  }
}

function processLottieFile(filePath: string): void {
  console.log(`\n🔍 Processing file: ${filePath}\n`);
  
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Read and parse JSON
  let data: LottieData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error: Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  
  // Validate Lottie structure
  if (typeof data !== 'object' || data === null) {
    console.error('❌ Error: Invalid JSON structure');
    process.exit(1);
  }
  
  const canvasWidth = data.w || 1200;
  const canvasHeight = data.h || 1200;
  console.log(`📐 Canvas dimensions: ${canvasWidth} x ${canvasHeight}`);
  
  const removedLayers: RemovedLayer[] = [];
  
  // Remove "Group Layer 8" specifically (known watermark)
  if (data.layers) {
    removeLayerByName(data.layers, 'Group Layer 8', 'Root', removedLayers);
  }
  
  // Remove other watermark layers by name and position
  if (data.layers) {
    removeWatermarkLayers(data.layers, canvasWidth, canvasHeight, 'Root', removedLayers);
  }
  
  // Process assets
  if (data.assets) {
    Object.entries(data.assets).forEach(([assetId, asset]) => {
      if (asset.layers) {
        removeLayerByName(asset.layers, 'Group Layer 8', `Asset ${assetId}`, removedLayers);
        removeWatermarkLayers(asset.layers, canvasWidth, canvasHeight, `Asset ${assetId}`, removedLayers);
      }
    });
  }
  
  // Report results
  if (removedLayers.length === 0) {
    console.log('\n✅ No watermarks found. File is already clean.\n');
    return;
  }
  
  console.log(`\n🗑️  Removed ${removedLayers.length} watermark layer(s):\n`);
  removedLayers.forEach((layer, index) => {
    console.log(`${index + 1}. ${layer.name} (type: ${layer.ty || 'unknown'})`);
    console.log(`   Path: ${layer.path}`);
    console.log(`   Reason: ${layer.reason}\n`);
  });
  
  // Create backup
  const backupPath = `${filePath}.backup`;
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backup created: ${backupPath}\n`);
  } catch (error) {
    console.error(`⚠️  Warning: Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    console.log('   Continuing without backup...\n');
  }
  
  // Save cleaned file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Cleaned file saved: ${filePath}\n`);
    console.log('✨ Watermark removal complete!\n');
  } catch (error) {
    console.error(`❌ Error: Failed to save cleaned file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Error: File path is required');
  console.log('\nUsage: npx tsx scripts/remove-lottie-watermark.ts <file-path>');
  console.log('Example: npx tsx scripts/remove-lottie-watermark.ts "imports/lottie/animation.json"\n');
  process.exit(1);
}

// Resolve absolute path if relative
const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

processLottieFile(resolvedPath);




