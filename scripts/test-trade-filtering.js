#!/usr/bin/env node

/**
 * Test script to verify trade filtering works correctly
 * Tests the same logic used in the app's supply page
 */

const fs = require('fs');
const path = require('path');

// Sample branches with different trade configurations
const testBranches = [
  {
    id: 'test-hvac-only',
    name: 'HVAC Only Branch',
    trades: ['HVAC']
  },
  {
    id: 'test-electrical-only',
    name: 'Electrical Only Branch',
    trades: ['Electrical']
  },
  {
    id: 'test-plumbing-only',
    name: 'Plumbing Only Branch',
    trades: ['Plumbing']
  },
  {
    id: 'test-multi-trade',
    name: 'Multi-Trade Branch',
    trades: ['HVAC', 'Plumbing'],
    primaryTrade: 'Plumbing'
  },
  {
    id: 'test-no-trades',
    name: 'No Trades Branch',
    trades: []
  }
];

/**
 * Filter branches by trade (same logic as in supply/page.tsx)
 */
function filterByTrade(branches, trade) {
  if (trade === 'all') {
    return branches;
  }
  
  return branches.filter((b) => {
    // Prioritize structured 'trades' field if available
    if (b.trades && Array.isArray(b.trades) && b.trades.length > 0) {
      const tradesLower = b.trades.map(t => t.toLowerCase());
      if (trade === 'hvac') return tradesLower.includes('hvac');
      if (trade === 'plumbing') return tradesLower.includes('plumbing');
      if (trade === 'electrical') return tradesLower.includes('electrical');
      if (trade === 'filter') return tradesLower.includes('filter');
      return false;
    }
    
    // If no trades array, branch won't be included
    return false;
  });
}

/**
 * Test filtering with various trade selections
 */
function runTests() {
  console.log('🧪 Testing Trade Filtering Logic\n');
  console.log('='.repeat(60));
  
  const trades = ['all', 'hvac', 'electrical', 'plumbing', 'filter'];
  let allPassed = true;
  
  for (const trade of trades) {
    const filtered = filterByTrade(testBranches, trade);
    console.log(`\n📋 Filter: "${trade}"`);
    console.log(`   Found: ${filtered.length} branches`);
    
    if (filtered.length > 0) {
      filtered.forEach(b => {
        console.log(`   - ${b.name} (trades: ${b.trades.join(', ')})`);
      });
    }
    
    // Validate results
    let expectedCount;
    switch (trade) {
      case 'all':
        expectedCount = 5;
        break;
      case 'hvac':
        expectedCount = 2; // HVAC Only + Multi-Trade
        break;
      case 'electrical':
        expectedCount = 1;
        break;
      case 'plumbing':
        expectedCount = 2; // Plumbing Only + Multi-Trade
        break;
      case 'filter':
        expectedCount = 0;
        break;
    }
    
    if (filtered.length !== expectedCount) {
      console.log(`   ❌ FAILED: Expected ${expectedCount}, got ${filtered.length}`);
      allPassed = false;
    } else {
      console.log(`   ✅ PASSED`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed!');
  return allPassed;
}

/**
 * Load and test actual Colorado data
 */
function testRealData() {
  console.log('\n\n🔍 Testing Real Colorado Data\n');
  console.log('='.repeat(60));
  
  const baseDir = path.join(__dirname, '..', 'supplyfind-updates', 'us', 'co');
  const files = [
    'denver-metro.json',
    'electrical/denver-metro.json',
    'electrical/boulder-broomfield-longmont.json'
  ];
  
  for (const file of files) {
    const filePath = path.join(baseDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  File not found: ${file}`);
      continue;
    }
    
    console.log(`\n📄 ${file}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.branches || !Array.isArray(data.branches)) {
        console.log('   ℹ️  No branches array');
        continue;
      }
      
      // Check all branches have trades array
      const branchesWithoutTrades = data.branches.filter(b => !b.trades || !Array.isArray(b.trades) || b.trades.length === 0);
      const branchesWithOldTrade = data.branches.filter(b => b.trade !== null && b.trade !== undefined);
      
      console.log(`   Total branches: ${data.branches.length}`);
      console.log(`   Branches without 'trades' array: ${branchesWithoutTrades.length}`);
      console.log(`   Branches with old 'trade' field: ${branchesWithOldTrade.length}`);
      
      if (branchesWithoutTrades.length > 0) {
        console.log('   ⚠️  Warning: Some branches missing trades array');
        branchesWithoutTrades.slice(0, 3).forEach(b => {
          console.log(`      - ${b.id}`);
        });
      }
      
      if (branchesWithOldTrade.length > 0) {
        console.log('   ⚠️  Warning: Some branches still have old trade field');
        branchesWithOldTrade.slice(0, 3).forEach(b => {
          console.log(`      - ${b.id}: trade="${b.trade}"`);
        });
      }
      
      // Test filtering
      const trades = data.branches.reduce((acc, b) => {
        if (b.trades && Array.isArray(b.trades)) {
          b.trades.forEach(t => acc.add(t));
        }
        return acc;
      }, new Set());
      
      console.log(`   Unique trade values: ${Array.from(trades).join(', ')}`);
      
      // Verify case consistency
      const inconsistentCase = Array.from(trades).filter(t => {
        return t !== 'HVAC' && t !== 'Plumbing' && t !== 'Electrical' && t !== 'Filter';
      });
      
      if (inconsistentCase.length > 0) {
        console.log(`   ⚠️  Inconsistent trade casing found: ${inconsistentCase.join(', ')}`);
      } else {
        console.log('   ✅ All trade values use consistent casing');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run tests
const testsPassed = runTests();
testRealData();

process.exit(testsPassed ? 0 : 1);
