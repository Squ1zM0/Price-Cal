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
 * @param {string} trade - Raw trade value to normalize
 * @param {Set} unknownTrades - Set to collect unknown trade values for reporting
 * @returns {string|null} - Normalized trade value or null
 */
function normalizeTrade(trade, unknownTrades = null) {
  if (!trade) return null;
  const normalized = TRADE_MAPPINGS[trade.trim()];
  if (!normalized) {
    if (unknownTrades) {
      unknownTrades.add(trade);
    }
    // Title case fallback
    return trade.charAt(0).toUpperCase() + trade.slice(1).toLowerCase();
  }
  return normalized;
}

/**
 * Normalize trades for a single branch
 * @param {object} branch - Branch object to normalize
 * @param {Set} unknownTrades - Set to collect unknown trade values for reporting
 * @returns {object} - Normalized branch object
 */
function normalizeBranch(branch, unknownTrades = null) {
  const normalized = { ...branch };
  
  // Collect all trade values
  const tradeSet = new Set();
  
  // From legacy "trade" field
  if (branch.trade && typeof branch.trade === 'string') {
    const standardTrade = normalizeTrade(branch.trade, unknownTrades);
    if (standardTrade) {
      tradeSet.add(standardTrade);
    }
  }
  
  // From "trades" array
  if (Array.isArray(branch.trades)) {
    branch.trades.forEach(t => {
      const standardTrade = normalizeTrade(t, unknownTrades);
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
    normalized.primaryTrade = normalizeTrade(branch.primaryTrade, unknownTrades);
  }
  
  return normalized;
}

/**
 * Process a single JSON file
 * @param {string} filePath - Path to JSON file to process
 * @param {Set} unknownTrades - Set to collect unknown trade values for reporting
 * @returns {object} - Processing statistics
 */
function processFile(filePath, unknownTrades) {
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
      const normalized = normalizeBranch(branch, unknownTrades);
      
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
 * @param {string} dir - Directory to search
 * @returns {string[]} - Array of file paths
 */
function findJsonFiles(dir) {
  const files = [];
  
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Exclude files starting with underscore (e.g., _needs_verification.json)
        // These are typically work-in-progress or metadata files
        if (!entry.name.startsWith('_')) {
          files.push(fullPath);
        }
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
  const unknownTrades = new Set();
  
  for (const file of jsonFiles) {
    const { processed, changed } = processFile(file, unknownTrades);
    totalProcessed += processed;
    totalChanged += changed;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Normalization Complete!');
  console.log(`   Total branches processed: ${totalProcessed}`);
  console.log(`   Total branches changed: ${totalChanged}`);
  
  if (unknownTrades.size > 0) {
    console.log('\n⚠️  Unknown trade values encountered:');
    Array.from(unknownTrades).forEach(trade => {
      console.log(`   - "${trade}"`);
    });
  }
  
  console.log('='.repeat(50) + '\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { normalizeBranch, normalizeTrade };
