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

// Constants for PDF layout - Enhanced for professional readability
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const PAGE_WIDTH = 215.9; // 8.5" in mm
const PAGE_HEIGHT = 279.4; // 11" in mm
const LINE_HEIGHT = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const SECTION_SPACING = 10; // Space between major sections
const SUBSECTION_SPACING = 6; // Space between subsections
const CARD_PADDING = 8; // Padding inside zone cards

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
 * Enhanced version with professional typography and layout
 */
export async function generatePumpSizingPDF(data: PDFExportData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let yPos = MARGIN_TOP;
  const now = new Date();

  // ==========================================
  // HEADER: Title and Timestamp
  // ==========================================
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Pump Sizing Calculation Report', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT * 1.5;

  // Underline title
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos);
  yPos += LINE_HEIGHT;

  // Add export timestamp
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const timestamp = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  pdf.text(`Generated: ${timestamp}`, MARGIN_LEFT, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += SECTION_SPACING;

  // ==========================================
  // SECTION 1: SYSTEM SUMMARY
  // ==========================================
  yPos = addSectionHeader(pdf, 'System Summary', yPos);
  
  const systemHeatLoad = parseFloat(data.advancedSettings.systemHeatLoadBTU) || 0;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // System-level results in a highlighted box
  const summaryBoxY = yPos;
  pdf.setFillColor(240, 245, 255); // Light blue background
  pdf.setDrawColor(200, 210, 230);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(MARGIN_LEFT, summaryBoxY, CONTENT_WIDTH, 28, 2, 2, 'FD');
  yPos = summaryBoxY + 5;
  
  pdf.setFontSize(10);
  yPos = addKeyValue(pdf, 'Total System Heat Load:', `${systemHeatLoad.toLocaleString()} BTU/hr`, yPos);
  yPos = addKeyValue(pdf, 'Total System Flow:', `${data.systemResults.totalFlowGPM.toFixed(2)} GPM`, yPos);
  yPos = addKeyValue(pdf, 'Required Pump Head:', `${data.systemResults.requiredHeadFt.toFixed(2)} ft`, yPos);
  yPos = addKeyValue(pdf, 'Critical Zone:', data.systemResults.criticalZone || 'N/A', yPos);
  
  yPos += 5;
  
  // Fluid and calculation settings
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Calculation Settings', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT * 0.8;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  yPos = addKeyValue(pdf, '  Fluid Type:', data.advancedSettings.fluidType, yPos, 9);
  yPos = addKeyValue(pdf, `  Temperature:`, `${data.advancedSettings.temperature}\u00B0F`, yPos, 9);
  yPos = addKeyValue(pdf, '  Method:', data.advancedSettings.calculationMethod, yPos, 9);
  yPos = addKeyValue(pdf, '  Safety Factors:', `Head: ${data.advancedSettings.headSafetyFactor}%, Flow: ${data.advancedSettings.flowSafetyFactor}%`, yPos, 9);
  
  yPos += SECTION_SPACING;

  // ==========================================
  // SECTION 2: ZONE SUMMARY GRID
  // ==========================================
  const validZones = data.zones.filter(z => z.valid);
  
  if (validZones.length > 0) {
    yPos = addSectionHeader(pdf, 'Zone Summary', yPos);
    
    // Layout zones in a grid: 2 columns for 2-4 zones, 3 columns for 5+ zones
    const zonesPerRow = validZones.length <= 4 ? 2 : 3;
    const cardWidth = (CONTENT_WIDTH - (zonesPerRow - 1) * 5) / zonesPerRow; // 5mm gap between cards
    
    let currentRow = 0;
    let maxRowHeight = 0;
    let rowStartY = yPos;
    
    validZones.forEach((zoneData, idx) => {
      const colIndex = idx % zonesPerRow;
      const xPos = MARGIN_LEFT + colIndex * (cardWidth + 5);
      
      // Start new row
      if (colIndex === 0 && idx > 0) {
        yPos = rowStartY + maxRowHeight + 5; // Move down by max row height + gap
        rowStartY = yPos;
        maxRowHeight = 0;
        currentRow++;
        
        // Check if we need a new page
        if (yPos > PAGE_HEIGHT - 80) {
          pdf.addPage();
          yPos = MARGIN_TOP;
          rowStartY = yPos;
        }
      }
      
      const endY = renderZoneCard(pdf, zoneData, idx, xPos, rowStartY, cardWidth);
      const cardHeight = endY - rowStartY;
      maxRowHeight = Math.max(maxRowHeight, cardHeight);
    });
    
    yPos = rowStartY + maxRowHeight + SECTION_SPACING;
  }
  
  // ==========================================
  // SECTION 3: PROOF OF CALCULATIONS
  // ==========================================
  // Start proof section on a new page for clarity
  if (validZones.length > 0) {
    pdf.addPage();
    yPos = MARGIN_TOP;
    
    yPos = addSectionHeader(pdf, 'Proof of Calculations', yPos);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Step-by-step mathematical derivation for each zone', MARGIN_LEFT, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += SECTION_SPACING;
  }
  
  // Iterate through zones for detailed math proof
  for (let i = 0; i < validZones.length; i++) {
    const zoneData = validZones[i];
    
    // Check if we need a new page
    if (yPos > PAGE_HEIGHT - 60) {
      pdf.addPage();
      yPos = MARGIN_TOP;
    }
    
    // Zone math header
    yPos = addSubsectionHeader(pdf, `Zone ${i + 1}: ${zoneData.zone.name}`, yPos);
    
    pdf.setFont('courier', 'normal'); // Monospace for math
    pdf.setFontSize(9);

    // 1. Heat Transfer Calculation
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('1. Heat Transfer Calculation', MARGIN_LEFT, yPos);
    yPos += LINE_HEIGHT;
    
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(9);
    
    // Formula with proper spacing
    pdf.text('Formula:  GPM = BTU/hr \u00F7 (500 \u00D7 \u0394T)', MARGIN_LEFT + 5, yPos);
    yPos += 5;
    
    pdf.text(`Substituting:  GPM = ${zoneData.zoneBTU.toLocaleString()} \u00F7 (500 \u00D7 ${zoneData.effectiveDeltaT.toFixed(1)})`, MARGIN_LEFT + 5, yPos);
    yPos += 5;
    
    const denominator = 500 * zoneData.effectiveDeltaT;
    pdf.text(`           = ${zoneData.zoneBTU.toLocaleString()} \u00F7 ${denominator.toFixed(1)}`, MARGIN_LEFT + 5, yPos);
    yPos += 5;
    
    pdf.setFont('courier', 'bold');
    pdf.text(`Result:  GPM = ${zoneData.flowGPM.toFixed(3)} GPM`, MARGIN_LEFT + 5, yPos);
    yPos += 8;
    pdf.setFont('courier', 'normal');

    // Get pipe data for this zone
    const pipeKey = `${zoneData.zone.material}-${zoneData.zone.size}`;
    const pipeData = data.pipeDataMap.get(pipeKey);
    
    if (pipeData) {
      // 2. Velocity Calculation
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('2. Velocity Calculation', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(9);
      
      const diameterFt = pipeData.internalDiameter / 12;
      const area = Math.PI * Math.pow(diameterFt / 2, 2);
      const flowCFS = zoneData.flowGPM / 448.83;
      
      pdf.text('Formula:  Velocity = Flow \u00F7 Cross-Sectional Area', MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Internal Diameter: ${pipeData.internalDiameter.toFixed(3)} inches = ${diameterFt.toFixed(4)} ft`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Area: \u03C0 \u00D7 (${diameterFt.toFixed(4)} / 2)\u00B2 = ${area.toFixed(6)} ft\u00B2`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Flow: ${zoneData.flowGPM.toFixed(2)} GPM = ${flowCFS.toFixed(5)} ft\u00B3/s`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Velocity: ${flowCFS.toFixed(5)} \u00F7 ${area.toFixed(6)}`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.setFont('courier', 'bold');
      pdf.text(`Result:  Velocity = ${zoneData.velocity.toFixed(3)} ft/s`, MARGIN_LEFT + 5, yPos);
      yPos += 8;
      pdf.setFont('courier', 'normal');

      // Check if we need a new page
      if (yPos > PAGE_HEIGHT - 70) {
        pdf.addPage();
        yPos = MARGIN_TOP;
      }

      // 3. Reynolds Number
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('3. Reynolds Number Calculation', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(9);
      
      pdf.text('Formula:  Re = (V \u00D7 D) \u00F7 \u03BD', MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Temperature: ${data.advancedSettings.temperature}\u00B0F`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Kinematic Viscosity (\u03BD): ${data.fluidProps.kinematicViscosity.toExponential(3)} ft\u00B2/s`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.text(`Re = (${zoneData.velocity.toFixed(3)} \u00D7 ${diameterFt.toFixed(4)}) \u00F7 ${data.fluidProps.kinematicViscosity.toExponential(3)}`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      pdf.setFont('courier', 'bold');
      pdf.text(`Result:  Re = ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + 5, yPos);
      yPos += 5;
      
      const flowRegime = zoneData.reynolds < 2300 ? 'Laminar' : zoneData.reynolds < 4000 ? 'Transitional' : 'Turbulent';
      pdf.setFont('courier', 'normal');
      pdf.text(`Flow Regime: ${flowRegime}`, MARGIN_LEFT + 5, yPos);
      yPos += 8;

      // 4. Friction Factor (if Darcy-Weisbach)
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('4. Friction Factor (Swamee-Jain)', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        
        const roughness = parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness;
        const relativeRoughness = roughness / diameterFt;
        
        pdf.text(`Absolute Roughness (\u03B5): ${roughness.toExponential(3)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        pdf.text(`Relative Roughness: \u03B5/D = ${relativeRoughness.toExponential(3)}`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, roughness, pipeData.internalDiameter);
        
        if (zoneData.reynolds < 2300) {
          pdf.text('Laminar:  f = 64 / Re', MARGIN_LEFT + 5, yPos);
          yPos += 5;
          pdf.text(`f = 64 / ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + 5, yPos);
          yPos += 5;
        } else {
          pdf.text('Turbulent - Swamee-Jain formula:', MARGIN_LEFT + 5, yPos);
          yPos += 5;
          pdf.text('f = 0.25 / [log(\u03B5/3.7D + 5.74/Re^0.9)]\u00B2', MARGIN_LEFT + 5, yPos);
          yPos += 5;
        }
        
        pdf.setFont('courier', 'bold');
        pdf.text(`Result:  f = ${frictionFactor.toFixed(6)}`, MARGIN_LEFT + 5, yPos);
        yPos += 8;
        pdf.setFont('courier', 'normal');
      }

      // Check if we need a new page
      if (yPos > PAGE_HEIGHT - 70) {
        pdf.addPage();
        yPos = MARGIN_TOP;
      }

      // 5. Head Loss Calculation
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.text('5. Head Loss (Darcy-Weisbach)', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        
        pdf.text('Formula:  h = f \u00D7 (L/D) \u00D7 (V\u00B2/2g)', MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        pdf.text('Effective Length Breakdown:', MARGIN_LEFT + 5, yPos);
        yPos += 5;
        pdf.text(`  Straight pipe:      ${zoneData.straightLength.toFixed(1)} ft`, MARGIN_LEFT + 8, yPos);
        yPos += 4;
        pdf.text(`  Fitting equivalent: ${zoneData.fittingEquivalentLength.toFixed(1)} ft`, MARGIN_LEFT + 8, yPos);
        yPos += 4;
        pdf.text(`  Emitter equivalent: ${zoneData.emitterEquivalentLength.toFixed(1)} ft`, MARGIN_LEFT + 8, yPos);
        yPos += 4;
        pdf.setFont('courier', 'bold');
        pdf.text(`  Total (L):          ${zoneData.totalEffectiveLength.toFixed(1)} ft`, MARGIN_LEFT + 8, yPos);
        yPos += 6;
        pdf.setFont('courier', 'normal');
        
        const g = 32.174;
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness, pipeData.internalDiameter);
        
        pdf.text(`Gravity (g): ${g} ft/s\u00B2`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        const ldRatio = zoneData.totalEffectiveLength / diameterFt;
        const vSquaredOver2g = Math.pow(zoneData.velocity, 2) / (2 * g);
        
        pdf.text(`h = ${frictionFactor.toFixed(6)} \u00D7 (${zoneData.totalEffectiveLength.toFixed(1)} / ${diameterFt.toFixed(4)}) \u00D7 (${zoneData.velocity.toFixed(3)}\u00B2 / (2 \u00D7 ${g}))`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        pdf.text(`  = ${frictionFactor.toFixed(6)} \u00D7 ${ldRatio.toFixed(2)} \u00D7 ${vSquaredOver2g.toFixed(5)}`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        pdf.setFont('courier', 'bold');
        pdf.text(`Result:  Head Loss = ${zoneData.headLoss.toFixed(3)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += 8;
        pdf.setFont('courier', 'normal');
      } else {
        // Hazen-Williams
        pdf.text('5. Head Loss (Hazen-Williams)', MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT;
        
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        
        pdf.text('Formula:  h = 4.52 \u00D7 L \u00D7 Q^1.85 / (C^1.85 \u00D7 D^4.87)', MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        const cValue = parseFloat(data.advancedSettings.customCValue) || pipeData.hazenWilliamsC;
        
        pdf.text(`C-value: ${cValue}`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        pdf.text(`Total Length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        pdf.text(`Flow (Q): ${zoneData.flowGPM.toFixed(2)} GPM`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        pdf.text(`Diameter (D): ${pipeData.internalDiameter.toFixed(3)} inches`, MARGIN_LEFT + 5, yPos);
        yPos += 5;
        
        pdf.setFont('courier', 'bold');
        pdf.text(`Result:  Head Loss = ${zoneData.headLoss.toFixed(3)} ft`, MARGIN_LEFT + 5, yPos);
        yPos += 8;
        pdf.setFont('courier', 'normal');
      }
    }

    yPos += SUBSECTION_SPACING;
    
    // Add separator between zones (except last)
    if (i < validZones.length - 1) {
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos);
      yPos += SUBSECTION_SPACING;
    }
  }

  // ==========================================
  // SECTION 4: ASSUMPTIONS & CONSTRAINTS
  // ==========================================
  if (yPos > PAGE_HEIGHT - 100) {
    pdf.addPage();
    yPos = MARGIN_TOP;
  }

  yPos = addSectionHeader(pdf, 'Assumptions & Constraints', yPos);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Fluid assumptions box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 0, 1, 1, 'S'); // Height will be adjusted
  const boxStartY = yPos;
  yPos += 4;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fluid Properties', MARGIN_LEFT + 3, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`\u2022 Fluid Type: ${data.advancedSettings.fluidType}`, MARGIN_LEFT + 5, yPos);
  yPos += 4;
  pdf.text(`\u2022 Temperature: ${data.advancedSettings.temperature}\u00B0F`, MARGIN_LEFT + 5, yPos);
  yPos += 4;
  pdf.text(`\u2022 Density: ${data.fluidProps.density.toFixed(3)} lb/ft\u00B3`, MARGIN_LEFT + 5, yPos);
  yPos += 4;
  pdf.text(`\u2022 Kinematic Viscosity: ${data.fluidProps.kinematicViscosity.toExponential(3)} ft\u00B2/s`, MARGIN_LEFT + 5, yPos);
  yPos += 5;
  
  // Draw filled box
  const boxHeight = yPos - boxStartY;
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(MARGIN_LEFT, boxStartY, CONTENT_WIDTH, boxHeight, 1, 1, 'FD');
  yPos += 2;
  
  // Calculation method
  pdf.setFont('helvetica', 'bold');
  pdf.text('Calculation Method', MARGIN_LEFT, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`\u2022 Method: ${data.advancedSettings.calculationMethod}`, MARGIN_LEFT + 2, yPos);
  yPos += 4;
  if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
    pdf.text('\u2022 Friction factor via Swamee-Jain approximation', MARGIN_LEFT + 2, yPos);
    yPos += 4;
  }
  yPos += 4;
  
  // Design constants
  pdf.setFont('helvetica', 'bold');
  pdf.text('Design Constants', MARGIN_LEFT, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('\u2022 Heat Transfer Constant: 500 BTU/(hr\u00B7GPM\u00B7\u00B0F)', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Gravity Constant: 32.174 ft/s\u00B2', MARGIN_LEFT + 2, yPos);
  yPos += 6;
  
  // Validity domain
  pdf.setFont('helvetica', 'bold');
  pdf.text('Validity Domain', MARGIN_LEFT, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('\u2022 Turbulent flow regime (Re > 4000 typical for hydronic systems)', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Closed-loop hydronic heating systems', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Temperature range: 40\u00B0F to 180\u00B0F', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  if (data.advancedSettings.calculationMethod === 'Hazen-Williams') {
    pdf.text('\u2022 Hazen-Williams valid for water only (not glycol solutions)', MARGIN_LEFT + 2, yPos);
    yPos += 4;
  }
  yPos += 4;
  
  // Velocity targets
  pdf.setFont('helvetica', 'bold');
  pdf.text('Velocity Target Ranges', MARGIN_LEFT, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('\u2022 Recommended: 2-4 ft/s (quiet operation, minimal erosion)', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Absolute maximum: 8 ft/s for water, 6 ft/s for glycol', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Minimum: ~1 ft/s (below this, air separation may occur)', MARGIN_LEFT + 2, yPos);
  yPos += 6;
  
  // Data sources
  pdf.setFont('helvetica', 'bold');
  pdf.text('Data Sources', MARGIN_LEFT, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('\u2022 Pipe dimensions: ASTM standards', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Fluid properties: NIST, ASHRAE Handbook - Fundamentals', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Roughness values: Engineering reference tables', MARGIN_LEFT + 2, yPos);
  yPos += 4;
  pdf.text('\u2022 Fitting equivalents: ASHRAE, crane technical papers', MARGIN_LEFT + 2, yPos);
  yPos += 8;
  
  // Disclaimer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
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
 * Add a key-value pair to the PDF with enhanced formatting
 */
function addKeyValue(pdf: jsPDF, key: string, value: string, yPos: number, fontSize = 10): number {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'normal');
  pdf.text(key, MARGIN_LEFT, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(value, MARGIN_LEFT + 70, yPos);
  pdf.setFont('helvetica', 'normal');
  return yPos + (fontSize * 0.5); // Proportional line height
}

/**
 * Render a zone summary card with inputs and results
 */
function renderZoneCard(
  pdf: jsPDF,
  zoneData: ZoneDataForPDF,
  zoneIndex: number,
  xPos: number,
  yPos: number,
  cardWidth: number
): number {
  const cardStartY = yPos;
  
  // Draw card background and border
  pdf.setFillColor(250, 252, 255); // Very light blue
  pdf.setDrawColor(180, 190, 210);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(xPos, yPos, cardWidth, 0, 2, 2, 'S'); // Will adjust height later
  
  yPos += CARD_PADDING;
  
  // Zone title
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 60, 120);
  pdf.text(`Zone ${zoneIndex + 1}`, xPos + CARD_PADDING, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += LINE_HEIGHT;
  
  // Separator line
  pdf.setDrawColor(200, 210, 230);
  pdf.setLineWidth(0.2);
  pdf.line(xPos + CARD_PADDING, yPos, xPos + cardWidth - CARD_PADDING, yPos);
  yPos += 4;
  
  // INPUTS section
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Inputs', xPos + CARD_PADDING, yPos);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const indent = xPos + CARD_PADDING + 2;
  const valueOffset = 45;
  
  // Heat Load
  pdf.text('Heat Load:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.zoneBTU.toLocaleString()} BTU/hr`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Emitter Type
  pdf.text('Emitter Type:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(zoneData.zone.emitterType, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Emitter Length (if > 0)
  if (zoneData.emitterEquivalentLength > 0) {
    pdf.text('Emitter Length:', indent, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${zoneData.emitterEquivalentLength.toFixed(1)} ft`, indent + valueOffset, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 4;
  }
  
  // Delta T with proper symbol
  pdf.text('\u0394T:', indent, yPos); // Δ symbol
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.effectiveDeltaT.toFixed(1)}\u00B0F`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Pipe
  pdf.text('Pipe:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.zone.material} ${zoneData.zone.size}`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Straight Length
  pdf.text('Straight Length:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.straightLength.toFixed(1)} ft`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Fittings summary (if any)
  const fittings = zoneData.zone.fittings;
  const fittingCount = (fittings["90\u00B0 Elbow"] || 0) + (fittings["45\u00B0 Elbow"] || 0) + (fittings["Tee (through)"] || 0);
  if (fittingCount > 0) {
    pdf.text('Fittings:', indent, yPos);
    pdf.setFont('helvetica', 'bold');
    const fittingParts = [];
    if (fittings["90\u00B0 Elbow"] > 0) fittingParts.push(`${fittings["90\u00B0 Elbow"]}\u00D790\u00B0`);
    if (fittings["45\u00B0 Elbow"] > 0) fittingParts.push(`${fittings["45\u00B0 Elbow"]}\u00D745\u00B0`);
    if (fittings["Tee (through)"] > 0) fittingParts.push(`${fittings["Tee (through)"]}\u00D7Tee`);
    pdf.text(fittingParts.join(', '), indent + valueOffset, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 4;
  }
  
  yPos += 2;
  
  // Separator line
  pdf.setDrawColor(200, 210, 230);
  pdf.setLineWidth(0.2);
  pdf.line(xPos + CARD_PADDING, yPos, xPos + cardWidth - CARD_PADDING, yPos);
  yPos += 4;
  
  // RESULTS section
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Results', xPos + CARD_PADDING, yPos);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  // Flow
  pdf.text('Flow:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 100, 200);
  pdf.text(`${zoneData.flowGPM.toFixed(2)} GPM`, indent + valueOffset, yPos);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Velocity
  pdf.text('Velocity:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.velocity.toFixed(2)} ft/s`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Head Loss
  pdf.text('Head Loss:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(200, 50, 50);
  pdf.text(`${zoneData.headLoss.toFixed(2)} ft`, indent + valueOffset, yPos);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Effective Length
  pdf.text('Effective Length:', indent, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${zoneData.totalEffectiveLength.toFixed(1)} ft`, indent + valueOffset, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 4;
  
  // Warnings/Flags
  if (zoneData.capacityCheck) {
    if (zoneData.capacityCheck.exceedsAbsolute) {
      yPos += 1;
      pdf.setFontSize(7);
      pdf.setTextColor(200, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('\u26A0 CRITICAL: Pipe undersized', indent, yPos);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      yPos += 4;
    } else if (zoneData.capacityCheck.exceedsRecommended) {
      yPos += 1;
      pdf.setFontSize(7);
      pdf.setTextColor(180, 120, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('\u26A0 WARNING: High velocity', indent, yPos);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      yPos += 4;
    }
  }
  
  yPos += CARD_PADDING;
  
  // Draw the complete card border with correct height
  const cardHeight = yPos - cardStartY;
  pdf.setFillColor(250, 252, 255);
  pdf.setDrawColor(180, 190, 210);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(xPos, cardStartY, cardWidth, cardHeight, 2, 2, 'FD');
  
  return yPos;
}
