/**
 * PDF Export Utility for Pump Sizing Calculator
 * 
 * This module generates comprehensive PDF reports that include:
 * 1. System Summary with design constants and metadata
 * 2. Per-Zone Summary with all inputs and results
 * 3. Proof of Math - step-by-step calculation breakdown (MANDATORY)
 * 4. Assumptions & Constraints
 * 
 * The PDF serves as a technical record for engineering review,
 * field verification, client documentation, and liability protection.
 */

import jsPDF from 'jspdf';
import type { PipeData } from './pipeData';
import type { FluidProperties, FluidType, CalculationMethod } from './hydraulics';
import { calculateVelocity, calculateReynolds, calculateFrictionFactor } from './hydraulics';

// Constants for PDF layout
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const PAGE_WIDTH = 215.9; // 8.5" in mm
const PAGE_HEIGHT = 279.4; // 11" in mm
const LINE_HEIGHT = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Zone data interface for PDF generation
export interface ZoneDataForPDF {
  zone: {
    id: string;
    name: string;
    assignedBTU: string;
    deltaT: string;
    deltaTMode: 'auto' | 'manual';
    emitterType: string;
    emitterLength: string;
    material: string;
    size: string;
    straightLength: string;
    fittings: {
      "90° Elbow": number;
      "45° Elbow": number;
      "Tee (through)": number;
    };
  };
  valid: boolean;
  zoneBTU: number;
  isAutoAssigned: boolean;
  effectiveDeltaT: number;
  isAutoDeltaT: boolean;
  flowGPM: number;
  straightLength: number;
  fittingEquivalentLength: number;
  emitterEquivalentLength: number;
  fittingBreakdown: Array<{
    type: string;
    count: number;
    eqLengthEach: number;
    total: number;
  }>;
  totalEffectiveLength: number;
  headLoss: number;
  velocity: number;
  reynolds: number;
  capacityCheck?: {
    maxRecommendedGPM: number;
    maxAbsoluteGPM: number;
    capacityBTURecommended: number;
    capacityBTUAbsolute: number;
    exceedsRecommended: boolean;
    exceedsAbsolute: boolean;
    utilizationPercent: number;
    hasLowVelocity: boolean;
    velocity: number;
  };
}

export interface SystemResultsForPDF {
  totalFlowGPM: number;
  requiredHeadFt: number;
  criticalZone: string | null;
}

export interface AdvancedSettingsForPDF {
  fluidType: FluidType;
  temperature: string;
  customDensity: string;
  customViscosity: string;
  calculationMethod: CalculationMethod;
  customRoughness: string;
  customCValue: string;
  headSafetyFactor: string;
  flowSafetyFactor: string;
  systemHeatLoadBTU: string;
}

export interface PDFExportData {
  zones: ZoneDataForPDF[];
  systemResults: SystemResultsForPDF;
  advancedSettings: AdvancedSettingsForPDF;
  pipeDataMap: Map<string, PipeData>;
  fluidProps: FluidProperties;
}

/**
 * Generate PDF report for pump sizing calculator
 */
export async function generatePumpSizingPDF(data: PDFExportData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let yPos = MARGIN_TOP;

  // Add title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Pump Sizing Calculation Report', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT * 2;

  // Add export timestamp
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  pdf.text(`Export Date: ${timestamp}`, MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT * 2;

  // ==========================================
  // SECTION 1: SYSTEM SUMMARY
  // ==========================================
  yPos = addSectionHeader(pdf, 'System Summary', yPos);
  
  const systemHeatLoad = parseFloat(data.advancedSettings.systemHeatLoadBTU) || 0;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  yPos = addKeyValue(pdf, 'Total System Heat Load:', `${systemHeatLoad.toLocaleString()} BTU/hr`, yPos);
  yPos = addKeyValue(pdf, 'Total System Flow:', `${data.systemResults.totalFlowGPM.toFixed(2)} GPM`, yPos);
  yPos = addKeyValue(pdf, 'Required Pump Head:', `${data.systemResults.requiredHeadFt.toFixed(2)} ft`, yPos);
  yPos = addKeyValue(pdf, 'Critical Zone:', data.systemResults.criticalZone || 'N/A', yPos);
  yPos = addKeyValue(pdf, 'Number of Zones:', `${data.zones.length}`, yPos);
  yPos += LINE_HEIGHT / 2;
  
  yPos = addKeyValue(pdf, 'Fluid Type:', data.advancedSettings.fluidType, yPos);
  yPos = addKeyValue(pdf, 'Fluid Temperature:', `${data.advancedSettings.temperature}°F`, yPos);
  yPos = addKeyValue(pdf, 'Calculation Method:', data.advancedSettings.calculationMethod, yPos);
  yPos += LINE_HEIGHT / 2;

  // Design Constants
  pdf.setFont('helvetica', 'bold');
  pdf.text('Design Constants:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.setFont('helvetica', 'normal');
  
  yPos = addKeyValue(pdf, '  Heat Transfer Constant:', '500 BTU/(hr·GPM·°F)', yPos);
  pdf.setFontSize(9);
  pdf.text('    (Specific heat of water × density × conversion factors)', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.setFontSize(10);
  
  yPos = addKeyValue(pdf, '  Gravity Constant:', '32.174 ft/s²', yPos);
  yPos = addKeyValue(pdf, '  Fluid Density:', `${data.fluidProps.density.toFixed(3)} lb/ft³`, yPos);
  yPos = addKeyValue(pdf, '  Kinematic Viscosity:', `${data.fluidProps.kinematicViscosity.toExponential(3)} ft²/s`, yPos);
  yPos += LINE_HEIGHT / 2;
  
  yPos = addKeyValue(pdf, 'Head Safety Factor:', `${data.advancedSettings.headSafetyFactor}%`, yPos);
  yPos = addKeyValue(pdf, 'Flow Safety Factor:', `${data.advancedSettings.flowSafetyFactor}%`, yPos);
  
  yPos += LINE_HEIGHT;

  // ==========================================
  // SECTION 2 & 3: PER-ZONE SUMMARIES + PROOF OF MATH
  // ==========================================
  for (let i = 0; i < data.zones.length; i++) {
    const zoneData = data.zones[i];
    
    if (!zoneData.valid) {
      continue; // Skip invalid zones
    }

    // Check if we need a new page
    if (yPos > PAGE_HEIGHT - 40) {
      pdf.addPage();
      yPos = MARGIN_TOP;
    }

    // Zone header
    yPos = addSectionHeader(pdf, `Zone ${i + 1}: ${zoneData.zone.name}`, yPos);

    // --- INPUTS ---
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inputs:', MARGIN_LEFT, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    yPos = addKeyValue(pdf, '  Zone Heat Load:', `${zoneData.zoneBTU.toLocaleString()} BTU/hr ${zoneData.isAutoAssigned ? '(auto-distributed)' : '(manual)'}`, yPos);
    yPos = addKeyValue(pdf, '  Emitter Type:', zoneData.zone.emitterType, yPos);
    yPos = addKeyValue(pdf, '  Emitter Equivalent Length:', `${zoneData.emitterEquivalentLength.toFixed(1)} ft`, yPos);
    yPos = addKeyValue(pdf, '  Temperature Difference (ΔT):', `${zoneData.effectiveDeltaT.toFixed(1)}°F ${zoneData.isAutoDeltaT ? '(auto)' : '(manual)'}`, yPos);
    yPos = addKeyValue(pdf, '  Straight Pipe Length:', `${zoneData.straightLength.toFixed(1)} ft`, yPos);
    yPos = addKeyValue(pdf, '  Pipe Material:', zoneData.zone.material, yPos);
    yPos = addKeyValue(pdf, '  Pipe Size:', zoneData.zone.size, yPos);
    
    // Fittings
    const fittings = zoneData.zone.fittings;
    if (fittings["90° Elbow"] > 0 || fittings["45° Elbow"] > 0 || fittings["Tee (through)"] > 0) {
      pdf.text('  Fittings:', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      if (fittings["90° Elbow"] > 0) {
        yPos = addKeyValue(pdf, `    90° Elbow:`, `${fittings["90° Elbow"]}`, yPos);
      }
      if (fittings["45° Elbow"] > 0) {
        yPos = addKeyValue(pdf, `    45° Elbow:`, `${fittings["45° Elbow"]}`, yPos);
      }
      if (fittings["Tee (through)"] > 0) {
        yPos = addKeyValue(pdf, `    Tee (through):`, `${fittings["Tee (through)"]}`, yPos);
      }
    }
    
    yPos += LINE_HEIGHT / 2;

    // --- RESULTS ---
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Results:', MARGIN_LEFT, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    yPos = addKeyValue(pdf, '  Calculated Flow:', `${zoneData.flowGPM.toFixed(2)} GPM`, yPos);
    yPos = addKeyValue(pdf, '  Velocity:', `${zoneData.velocity.toFixed(2)} ft/s`, yPos);
    yPos = addKeyValue(pdf, '  Reynolds Number:', `${zoneData.reynolds.toFixed(0)}`, yPos);
    yPos = addKeyValue(pdf, '  Total Effective Length:', `${zoneData.totalEffectiveLength.toFixed(1)} ft`, yPos);
    yPos = addKeyValue(pdf, '  Head Loss:', `${zoneData.headLoss.toFixed(2)} ft`, yPos);
    
    // Warnings
    if (zoneData.capacityCheck) {
      if (zoneData.capacityCheck.exceedsAbsolute) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(200, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('  ⚠ WARNING: Pipe Undersized - Critical Issue', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`  Load exceeds absolute pipe capacity (${zoneData.capacityCheck.capacityBTUAbsolute.toLocaleString()} BTU/hr)`, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        pdf.setTextColor(0, 0, 0);
      } else if (zoneData.capacityCheck.exceedsRecommended) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(180, 120, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('  ⚠ WARNING: Flow Velocity Exceeds Recommended Limit', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`  Load exceeds recommended capacity (${zoneData.capacityCheck.capacityBTURecommended.toLocaleString()} BTU/hr)`, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    yPos += LINE_HEIGHT;

    // Check if we need a new page before proof of math
    if (yPos > PAGE_HEIGHT - 80) {
      pdf.addPage();
      yPos = MARGIN_TOP;
    }

    // ==========================================
    // PROOF OF MATH SECTION (MANDATORY)
    // ==========================================
    yPos = addSubsectionHeader(pdf, 'Proof of Math (Step-by-Step Calculations)', yPos);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // 1. Heat Transfer Calculation
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. Heat Transfer Calculation (GPM from BTU/hr and ΔT):', MARGIN_LEFT, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text('Formula: GPM = BTU/hr ÷ (500 × ΔT)', MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.text(`Substituting values: GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ (500 × ${zoneData.effectiveDeltaT.toFixed(1)})`, MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT;
    
    const denominator = 500 * zoneData.effectiveDeltaT;
    pdf.text(`GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ ${denominator.toFixed(1)}`, MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`GPM = ${zoneData.flowGPM.toFixed(2)}`, MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT * 1.5;
    pdf.setFont('helvetica', 'normal');

    // Get pipe data for this zone
    const pipeKey = `${zoneData.zone.material}-${zoneData.zone.size}`;
    const pipeData = data.pipeDataMap.get(pipeKey);
    
    if (pipeData) {
      // 2. Velocity Calculation
      pdf.setFont('helvetica', 'bold');
      pdf.text('2. Velocity Calculation:', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text('Formula: Velocity = Flow ÷ Pipe Cross-Sectional Area', MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      const diameterFt = pipeData.internalDiameter / 12;
      const area = Math.PI * Math.pow(diameterFt / 2, 2);
      const flowCFS = zoneData.flowGPM / 448.83;
      
      pdf.text(`Pipe Internal Diameter: ${pipeData.internalDiameter.toFixed(3)} inches = ${diameterFt.toFixed(4)} ft`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Cross-Sectional Area: π × (${diameterFt.toFixed(4)} / 2)² = ${area.toFixed(6)} ft²`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Flow: ${zoneData.flowGPM.toFixed(2)} GPM = ${flowCFS.toFixed(4)} ft³/s`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Velocity: ${flowCFS.toFixed(4)} ÷ ${area.toFixed(6)} ft²`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Velocity = ${zoneData.velocity.toFixed(2)} ft/s`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT * 1.5;
      pdf.setFont('helvetica', 'normal');

      // Check if we need a new page
      if (yPos > PAGE_HEIGHT - 60) {
        pdf.addPage();
        yPos = MARGIN_TOP;
      }

      // 3. Reynolds Number
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. Reynolds Number Calculation:', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text('Formula: Re = (Velocity × Diameter) ÷ Kinematic Viscosity', MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Assumed Water Temperature: ${data.advancedSettings.temperature}°F`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Kinematic Viscosity: ${data.fluidProps.kinematicViscosity.toExponential(3)} ft²/s`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.text(`Re = (${zoneData.velocity.toFixed(2)} × ${diameterFt.toFixed(4)}) ÷ ${data.fluidProps.kinematicViscosity.toExponential(3)}`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Reynolds Number = ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT;
      
      const flowRegime = zoneData.reynolds < 2300 ? 'Laminar' : zoneData.reynolds < 4000 ? 'Transitional' : 'Turbulent';
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Flow Regime: ${flowRegime}`, MARGIN_LEFT + 5, yPos);
      yPos += LINE_HEIGHT * 1.5;

      // 4. Friction Factor (if Darcy-Weisbach)
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        pdf.text('4. Friction Factor Calculation (Swamee-Jain Approximation):', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('helvetica', 'normal');
        const roughness = parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness;
        const relativeRoughness = roughness / diameterFt;
        
        pdf.text(`Absolute Roughness: ${roughness.toExponential(3)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.text(`Relative Roughness: ${roughness.toExponential(3)} ÷ ${diameterFt.toFixed(4)} = ${relativeRoughness.toExponential(3)}`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, roughness, pipeData.internalDiameter);
        
        if (zoneData.reynolds < 2300) {
          pdf.text('Laminar flow: f = 64 / Re', MARGIN_LEFT + 5, yPos);
          yPos += LINE_HEIGHT;
          pdf.text(`f = 64 / ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + 5, yPos);
          yPos += LINE_HEIGHT;
        } else {
          pdf.text('Turbulent flow - Swamee-Jain formula:', MARGIN_LEFT + 5, yPos);
          yPos += LINE_HEIGHT;
          pdf.text('f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re⁰·⁹)]²', MARGIN_LEFT + 5, yPos);
          yPos += LINE_HEIGHT;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Friction Factor (f) = ${frictionFactor.toFixed(6)}`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT * 1.5;
        pdf.setFont('helvetica', 'normal');
      }

      // Check if we need a new page
      if (yPos > PAGE_HEIGHT - 50) {
        pdf.addPage();
        yPos = MARGIN_TOP;
      }

      // 5. Head Loss Calculation
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        pdf.text('5. Head Loss Calculation (Darcy-Weisbach Equation):', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text('Formula: h = f × (L/D) × (V²/2g)', MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.text('Effective Length Breakdown:', MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`  Straight pipe: ${zoneData.straightLength.toFixed(1)} ft`, MARGIN_LEFT + 10, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`  Fitting equivalent: ${zoneData.fittingEquivalentLength.toFixed(1)} ft`, MARGIN_LEFT + 10, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`  Emitter equivalent: ${zoneData.emitterEquivalentLength.toFixed(1)} ft`, MARGIN_LEFT + 10, yPos);
        yPos += LINE_HEIGHT;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`  Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`, MARGIN_LEFT + 10, yPos);
        yPos += LINE_HEIGHT;
        pdf.setFont('helvetica', 'normal');
        
        const g = 32.174;
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness, pipeData.internalDiameter);
        
        pdf.text(`Gravity constant (g): ${g} ft/s²`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.text(`h = ${frictionFactor.toFixed(6)} × (${zoneData.totalEffectiveLength.toFixed(1)} / ${diameterFt.toFixed(4)}) × (${zoneData.velocity.toFixed(2)}² / (2 × ${g}))`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        const ldRatio = zoneData.totalEffectiveLength / diameterFt;
        const vSquaredOver2g = Math.pow(zoneData.velocity, 2) / (2 * g);
        
        pdf.text(`h = ${frictionFactor.toFixed(6)} × ${ldRatio.toFixed(2)} × ${vSquaredOver2g.toFixed(4)}`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT * 1.5;
        pdf.setFont('helvetica', 'normal');
      } else {
        // Hazen-Williams
        pdf.setFont('helvetica', 'bold');
        pdf.text('5. Head Loss Calculation (Hazen-Williams Equation):', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text('Formula: h = 4.52 × L × Q¹·⁸⁵ / (C¹·⁸⁵ × D⁴·⁸⁷)', MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        const cValue = parseFloat(data.advancedSettings.customCValue) || pipeData.hazenWilliamsC;
        
        pdf.text(`C-value: ${cValue}`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`Flow (Q): ${zoneData.flowGPM.toFixed(2)} GPM`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        pdf.text(`Diameter (D): ${pipeData.internalDiameter.toFixed(3)} inches`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += LINE_HEIGHT * 1.5;
        pdf.setFont('helvetica', 'normal');
      }
    }

    yPos += LINE_HEIGHT;
    
    // Add separator between zones
    if (i < data.zones.length - 1) {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos);
      yPos += LINE_HEIGHT * 2;
    }
  }

  // ==========================================
  // SECTION 4: ASSUMPTIONS & CONSTRAINTS
  // ==========================================
  if (yPos > PAGE_HEIGHT - 80) {
    pdf.addPage();
    yPos = MARGIN_TOP;
  }

  yPos = addSectionHeader(pdf, 'Assumptions & Constraints', yPos);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Fluid Assumptions:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  yPos = addKeyValue(pdf, '  Fluid:', data.advancedSettings.fluidType, yPos);
  yPos = addKeyValue(pdf, '  Temperature:', `${data.advancedSettings.temperature}°F`, yPos);
  yPos = addKeyValue(pdf, '  Density:', `${data.fluidProps.density.toFixed(3)} lb/ft³`, yPos);
  yPos = addKeyValue(pdf, '  Kinematic Viscosity:', `${data.fluidProps.kinematicViscosity.toExponential(3)} ft²/s`, yPos);
  yPos += LINE_HEIGHT;
  
  pdf.text('Calculation Method:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  yPos = addKeyValue(pdf, '  Method:', data.advancedSettings.calculationMethod, yPos);
  if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
    pdf.text('  Friction factor via Swamee-Jain approximation', MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT;
  }
  yPos += LINE_HEIGHT;
  
  pdf.text('Validity Domain:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Turbulent flow regime (Re > 4000 typical for hydronic systems)', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Closed-loop hydronic heating systems', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Temperature range: 40°F to 180°F', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  if (data.advancedSettings.calculationMethod === 'Hazen-Williams') {
    pdf.text('  • Hazen-Williams valid for water only (not glycol solutions)', MARGIN_LEFT + 5, yPos);
    yPos += LINE_HEIGHT;
  }
  yPos += LINE_HEIGHT;
  
  pdf.text('Velocity Target Ranges:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Recommended: 2-4 ft/s (quiet operation, minimal erosion)', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Absolute maximum: 8 ft/s for water, 6 ft/s for glycol', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Minimum: ~1 ft/s (below this, air separation may occur)', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT * 2;
  
  pdf.text('Data Sources:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Pipe dimensions: ASTM standards', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Fluid properties: NIST, ASHRAE Handbook - Fundamentals', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Roughness values: Engineering reference tables', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Fitting equivalents: ASHRAE, crane technical papers', MARGIN_LEFT + 5, yPos);
  yPos += LINE_HEIGHT * 2;
  
  // Disclaimer
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  const disclaimer = 'DISCLAIMER: This report is for preliminary sizing only. Professional engineering review is required for final design. ' +
    'All calculations are based on stated assumptions and design constants. Field conditions may vary. ' +
    'Verify all values before equipment procurement or installation.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, CONTENT_WIDTH);
  pdf.text(disclaimerLines, MARGIN_LEFT, yPos);

  // Save the PDF
  const filename = `Pump-Sizing-Report-${now.toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

/**
 * Add a section header to the PDF
 */
function addSectionHeader(pdf: jsPDF, title: string, yPos: number): number {
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 80, 180);
  pdf.text(title, MARGIN_LEFT, yPos);
  pdf.setTextColor(0, 0, 0);
  
  yPos += LINE_HEIGHT;
  
  // Underline
  pdf.setDrawColor(0, 80, 180);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_LEFT, yPos - 2, PAGE_WIDTH - MARGIN_RIGHT, yPos - 2);
  
  yPos += LINE_HEIGHT / 2;
  return yPos;
}

/**
 * Add a subsection header to the PDF
 */
function addSubsectionHeader(pdf: jsPDF, title: string, yPos: number): number {
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text(title, MARGIN_LEFT, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += LINE_HEIGHT;
  return yPos;
}

/**
 * Add a key-value pair to the PDF
 */
function addKeyValue(pdf: jsPDF, key: string, value: string, yPos: number): number {
  pdf.setFont('helvetica', 'normal');
  pdf.text(key, MARGIN_LEFT, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(value, MARGIN_LEFT + 70, yPos);
  pdf.setFont('helvetica', 'normal');
  return yPos + LINE_HEIGHT;
}
