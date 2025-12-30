#!/usr/bin/env node

/**
 * Normalize trade classifications in SupplyFind Colorado dataset
 * 
 * This script:
 * 1. Removes legacy "trade" field (singular)
 * 2. Ensures all branches have "trades" array
 * 3. Normalizes trade values with proper casing
 * 4. Preserves primaryTrade field where it exists
 */

const fs = require('fs');
const path = require('path');

// Standard trade values with proper casing
const TRADE_MAPPINGS = {
  'hvac': 'HVAC',
  'plumbing': 'Plumbing',
  'electrical': 'Electrical',
  'filter': 'Filter',
  'filters': 'Filter',
  // Variations
  'HVAC': 'HVAC',
  'Plumbing': 'Plumbing',
  'Electrical': 'Electrical',
  'Filter': 'Filter'
};

/**
 * Normalize a single trade value to standard casing
 */
function normalizeTrade(trade) {
  if (!trade) return null;
  const normalized = TRADE_MAPPINGS[trade.trim()];
  if (!normalized) {
    console.warn(`  ⚠️  Unknown trade value: "${trade}"`);
    // Title case fallback
    return trade.charAt(0).toUpperCase() + trade.slice(1).toLowerCase();
  }
  return normalized;
}

/**
 * Normalize trades for a single branch
 */
function normalizeBranch(branch) {
  const normalized = { ...branch };
  
  // Collect all trade values
  const tradeSet = new Set();
  
  // From legacy "trade" field
  if (branch.trade && typeof branch.trade === 'string') {
    const standardTrade = normalizeTrade(branch.trade);
    if (standardTrade) {
      tradeSet.add(standardTrade);
    }
  }
  
  // From "trades" array
  if (Array.isArray(branch.trades)) {
    branch.trades.forEach(t => {
      const standardTrade = normalizeTrade(t);
      if (standardTrade) {
        tradeSet.add(standardTrade);
      }
    });
  }
  
  // Set normalized trades array
  normalized.trades = Array.from(tradeSet).sort();
  
  // Remove legacy "trade" field
  delete normalized.trade;
  
  // Preserve primaryTrade if it exists, normalizing its value
  if (branch.primaryTrade) {
    normalized.primaryTrade = normalizeTrade(branch.primaryTrade);
  }
  
  return normalized;
}

/**
 * Process a single JSON file
 */
function processFile(filePath) {
  console.log(`\n📄 Processing: ${path.relative(process.cwd(), filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.branches || !Array.isArray(data.branches)) {
      console.log('  ℹ️  No branches array found, skipping');
      return { processed: 0, changed: 0 };
    }
    
    let changedCount = 0;
    const normalizedBranches = data.branches.map(branch => {
      const normalized = normalizeBranch(branch);
      
      // Check if anything changed
      const originalTrade = JSON.stringify({ trade: branch.trade, trades: branch.trades, primaryTrade: branch.primaryTrade });
      const normalizedTrade = JSON.stringify({ trade: normalized.trade, trades: normalized.trades, primaryTrade: normalized.primaryTrade });
      
      if (originalTrade !== normalizedTrade) {
        changedCount++;
      }
      
      return normalized;
    });
    
    // Update data with normalized branches
    data.branches = normalizedBranches;
    
    // Write back to file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    
    console.log(`  ✅ Processed ${data.branches.length} branches (${changedCount} changed)`);
    
    return { processed: data.branches.length, changed: changedCount };
    
  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
    return { processed: 0, changed: 0 };
  }
}

/**
 * Find all JSON files recursively
 */
function findJsonFiles(dir) {
  const files = [];
  
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  const baseDir = path.join(__dirname, '..', 'supplyfind-updates', 'us', 'co');
  
  console.log('🔧 Trade Classification Normalization Tool');
  console.log('==========================================');
  console.log(`\n📂 Scanning directory: ${baseDir}\n`);
  
  if (!fs.existsSync(baseDir)) {
    console.error(`❌ Directory not found: ${baseDir}`);
    process.exit(1);
  }
  
  const jsonFiles = findJsonFiles(baseDir);
  console.log(`📋 Found ${jsonFiles.length} JSON files to process\n`);
  
  let totalProcessed = 0;
  let totalChanged = 0;
  
  for (const file of jsonFiles) {
    const { processed, changed } = processFile(file);
    totalProcessed += processed;
    totalChanged += changed;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Normalization Complete!');
  console.log(`   Total branches processed: ${totalProcessed}`);
  console.log(`   Total branches changed: ${totalChanged}`);
  console.log('='.repeat(50) + '\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { normalizeBranch, normalizeTrade };
