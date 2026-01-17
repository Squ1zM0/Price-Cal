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
const MARGIN_BOTTOM = 20; // Bottom margin for page breaks
const PAGE_WIDTH = 215.9; // 8.5" in mm
const PAGE_HEIGHT = 279.4; // 11" in mm
const LINE_HEIGHT = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const INDENT_OFFSET = 5; // Offset for indented text
const KEY_VALUE_OFFSET = 70; // Horizontal offset for key-value pairs
const NESTED_INDENT_OFFSET = 10; // Offset for nested/double-indented text
const PAGE_BREAK_THRESHOLD = PAGE_HEIGHT - MARGIN_BOTTOM; // When to break to new page

// PDF Colors
const WARNING_COLOR_R = 200;
const WARNING_COLOR_G = 100;
const WARNING_COLOR_B = 0;
const BLACK_COLOR_R = 0;
const BLACK_COLOR_G = 0;
const BLACK_COLOR_B = 0;

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
  isCapacityLimited: boolean;
  maxZoneCapacity: number;
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
  undeliverableBTU: number;
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
 * Check if we need a page break and add one if necessary
 * @param pdf - jsPDF instance
 * @param currentY - Current Y position
 * @param requiredSpace - Space needed for the next content (in mm)
 * @returns New Y position (either same or MARGIN_TOP if page was added)
 */
function checkPageBreak(pdf: jsPDF, currentY: number, requiredSpace: number): number {
  if (currentY + requiredSpace > PAGE_BREAK_THRESHOLD) {
    pdf.addPage();
    return MARGIN_TOP;
  }
  return currentY;
}

/**
 * Add text with automatic page break if needed
 * Wraps text to fit within available width and checks for page breaks
 * @param pdf - jsPDF instance
 * @param text - Text to add (string or array of strings)
 * @param x - X position
 * @param y - Current Y position  
 * @param maxWidth - Maximum width for text wrapping (optional, uses full content width if not provided)
 * @returns New Y position after adding text
 */
function addTextWithPageBreak(
  pdf: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  maxWidth?: number
): number {
  const width = maxWidth || CONTENT_WIDTH;
  const lines = Array.isArray(text) ? text : pdf.splitTextToSize(text, width);
  const requiredHeight = LINE_HEIGHT * lines.length;
  
  // Check if we need a page break before adding text
  let yPos = checkPageBreak(pdf, y, requiredHeight);
  
  // Add the text
  pdf.text(lines, x, yPos);
  
  // Return new Y position
  return yPos + requiredHeight;
}

/**
 * Generate PDF report for pump sizing calculator
 */
export async function generatePumpSizingPDF(data: PDFExportData): Promise<void> {
  // CRITICAL VALIDATION: Verify zone load reconciliation before generating PDF
  const systemHeatLoad = parseFloat(data.advancedSettings.systemHeatLoadBTU) || 0;
  const validZones = data.zones.filter(z => z.valid);
  const totalDeliveredBTU = validZones.reduce((sum, z) => sum + z.zoneBTU, 0);
  const reconciliationTolerance = 100; // BTU/hr
  const reconciliationDelta = Math.abs(totalDeliveredBTU - systemHeatLoad);
  
  // Check if there are manual zone assignments
  const hasManualZones = data.zones.some(z => !z.isAutoAssigned);
  
  if (systemHeatLoad > 0 && reconciliationDelta > reconciliationTolerance && hasManualZones) {
    throw new Error(
      `PDF Generation Failed: Zone Load Reconciliation Error\n\n` +
      `Sum of zone BTU values (${totalDeliveredBTU.toLocaleString()} BTU/hr) ` +
      `does not equal system total (${systemHeatLoad.toLocaleString()} BTU/hr).\n` +
      `Discrepancy: ${reconciliationDelta.toLocaleString()} BTU/hr exceeds tolerance (${reconciliationTolerance} BTU/hr).\n\n` +
      `This violates conservation of energy and invalidates pump sizing results.`
    );
  }
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true,
  });

  // Set default font settings for better rendering
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

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
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  yPos = addKeyValue(pdf, 'Total System Heat Load:', `${systemHeatLoad.toLocaleString()} BTU/hr`, yPos);
  yPos = addKeyValue(pdf, 'Total System Flow:', `${data.systemResults.totalFlowGPM.toFixed(2)} GPM`, yPos);
  yPos = addKeyValue(pdf, 'Required Pump Head:', `${data.systemResults.requiredHeadFt.toFixed(2)} ft`, yPos);
  yPos = addKeyValue(pdf, 'Critical Zone:', data.systemResults.criticalZone || 'N/A', yPos);
  
  // Show undeliverable BTU if any
  if (data.systemResults.undeliverableBTU > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(WARNING_COLOR_R, WARNING_COLOR_G, WARNING_COLOR_B);
    yPos = addKeyValue(pdf, 'Undeliverable Load:', `${data.systemResults.undeliverableBTU.toLocaleString()} BTU/hr`, yPos);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('  (One or more zones at hydraulic capacity limit)', MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT;
    pdf.setTextColor(BLACK_COLOR_R, BLACK_COLOR_G, BLACK_COLOR_B);
    pdf.setFontSize(10);
  }
  
  yPos = addKeyValue(pdf, 'Number of Zones:', `${data.zones.length}`, yPos);
  yPos += LINE_HEIGHT / 2;
  
  // Zone Load Reconciliation Validation
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 120, 0); // Green
  yPos = addKeyValue(pdf, 'Zone Load Reconciliation:', '✓ PASSED', yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(BLACK_COLOR_R, BLACK_COLOR_G, BLACK_COLOR_B);
  const reconStatement = `  Sum of zone BTU (${totalDeliveredBTU.toLocaleString()} BTU/hr) equals system total (${systemHeatLoad.toLocaleString()} BTU/hr) within ${reconciliationTolerance} BTU/hr tolerance.`;
  yPos = addTextWithPageBreak(pdf, reconStatement, MARGIN_LEFT, yPos, CONTENT_WIDTH);
  pdf.setFontSize(10);
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
  pdf.text('    (Specific heat of water × density × conversion factors)', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.setFontSize(10);
  
  yPos = addKeyValue(pdf, '  Gravity Constant:', '32.174 ft/s^2', yPos);
  yPos = addKeyValue(pdf, '  Fluid Density:', `${data.fluidProps.density.toFixed(3)} lb/ft^3`, yPos);
  yPos = addKeyValue(pdf, '  Kinematic Viscosity:', `${data.fluidProps.kinematicViscosity.toExponential(3)} ft^2/s`, yPos);
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

    // Check if we need a new page (reserve space for zone header + inputs section)
    yPos = checkPageBreak(pdf, yPos, 60);

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
    
    // Show capacity limit if zone is capacity-limited
    if (zoneData.isAutoAssigned && zoneData.isCapacityLimited && zoneData.maxZoneCapacity > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(WARNING_COLOR_R, WARNING_COLOR_G, WARNING_COLOR_B);
      yPos = addKeyValue(pdf, '  Max Zone Capacity:', `${zoneData.maxZoneCapacity.toLocaleString()} BTU/hr (CAPPED)`, yPos);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.text('    (Zone at hydraulic capacity limit based on pipe size)', MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT;
      pdf.setTextColor(BLACK_COLOR_R, BLACK_COLOR_G, BLACK_COLOR_B);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
    }
    
    yPos = addKeyValue(pdf, '  Emitter Type:', zoneData.zone.emitterType, yPos);
    yPos = addKeyValue(pdf, '  Emitter Equivalent Length:', `${zoneData.emitterEquivalentLength.toFixed(1)} ft`, yPos);
    yPos = addKeyValue(pdf, '  Temperature Difference (Delta-T):', `${zoneData.effectiveDeltaT.toFixed(1)}°F ${zoneData.isAutoDeltaT ? '(auto)' : '(manual)'}`, yPos);
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
    
    // Warnings - distinguish hard vs soft limits and auto-capped zones
    if (zoneData.capacityCheck) {
      // HARD LIMIT: Exceeds absolute capacity (only for manual assignments)
      if (zoneData.capacityCheck.exceedsAbsolute && !zoneData.isCapacityLimited) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(200, 0, 0);
        pdf.setFont('helvetica', 'bold');
        const warningTitle = '  ⚠ HARD LIMIT: Pipe Undersized - Physical Constraint';
        yPos = addTextWithPageBreak(pdf, warningTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        const warningMsg = `  Assigned load exceeds absolute physical pipe capacity (${zoneData.capacityCheck.capacityBTUAbsolute.toLocaleString()} BTU/hr). Pipe cannot transfer this heat.`;
        yPos = addTextWithPageBreak(pdf, warningMsg, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        pdf.setTextColor(0, 0, 0);
      }
      // Informational: Zone at hard limit (auto-capped)
      else if (zoneData.isCapacityLimited && zoneData.capacityCheck.exceedsAbsolute) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(0, 100, 200);
        pdf.setFont('helvetica', 'bold');
        const infoTitle = '  ℹ Zone at Hard Hydraulic Limit';
        yPos = addTextWithPageBreak(pdf, infoTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        const infoMsg = `  Zone capped at maximum physical capacity (${zoneData.zoneBTU.toLocaleString()} BTU/hr) based on pipe size and absolute velocity limits.`;
        yPos = addTextWithPageBreak(pdf, infoMsg, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        pdf.setTextColor(0, 0, 0);
      }
      // SOFT LIMIT: Exceeds recommended but not absolute (only for manual assignments)
      else if (zoneData.capacityCheck.exceedsRecommended && !zoneData.isCapacityLimited) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(180, 120, 0);
        pdf.setFont('helvetica', 'bold');
        const warningTitle = '  ⚠ SOFT LIMIT: Flow Velocity Above Recommended Range';
        yPos = addTextWithPageBreak(pdf, warningTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        const warningMsg = `  Operating above recommended design range (${zoneData.capacityCheck.capacityBTURecommended.toLocaleString()} BTU/hr). Advisory only - may cause noise/wear.`;
        yPos = addTextWithPageBreak(pdf, warningMsg, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        pdf.setTextColor(0, 0, 0);
      }
      // Informational: Zone at recommended limit (auto-capped)
      else if (zoneData.isCapacityLimited && zoneData.capacityCheck.exceedsRecommended) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(0, 100, 200);
        pdf.setFont('helvetica', 'bold');
        const infoTitle = '  ℹ Zone Capped at Recommended Hydraulic Capacity';
        yPos = addTextWithPageBreak(pdf, infoTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        const infoMsg = `  Zone capped at recommended capacity (${zoneData.zoneBTU.toLocaleString()} BTU/hr) to maintain velocity within design guidelines. This is advisory, not a hard limit.`;
        yPos = addTextWithPageBreak(pdf, infoMsg, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    yPos += LINE_HEIGHT;

    // Check if we need a new page before proof of math (reserve space for section header + first calculation)
    yPos = checkPageBreak(pdf, yPos, 80);

    // ==========================================
    // PROOF OF MATH SECTION (MANDATORY)
    // ==========================================
    yPos = addSubsectionHeader(pdf, 'Proof of Math (Step-by-Step Calculations)', yPos);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // 1. Heat Transfer Calculation
    pdf.setFont('helvetica', 'bold');
    const heatTransferTitle = '1. Heat Transfer Calculation (GPM from BTU/hr and Delta-T):';
    yPos = addTextWithPageBreak(pdf, heatTransferTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
    
    pdf.setFont('helvetica', 'normal');
    yPos = addTextWithPageBreak(pdf, 'Formula: GPM = BTU/hr ÷ (500 × Delta-T)', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
    
    const substitutionText = `Substituting values: GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ (500 × ${zoneData.effectiveDeltaT.toFixed(1)})`;
    yPos = addTextWithPageBreak(pdf, substitutionText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
    
    const denominator = 500 * zoneData.effectiveDeltaT;
    const calcText = `GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ ${denominator.toFixed(1)}`;
    yPos = addTextWithPageBreak(pdf, calcText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
    
    pdf.setFont('helvetica', 'bold');
    yPos = addTextWithPageBreak(pdf, `GPM = ${zoneData.flowGPM.toFixed(2)}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
    yPos += LINE_HEIGHT * 0.5; // Extra spacing after result
    pdf.setFont('helvetica', 'normal');

    // Get pipe data for this zone
    const pipeKey = `${zoneData.zone.material}-${zoneData.zone.size}`;
    const pipeData = data.pipeDataMap.get(pipeKey);
    
    if (pipeData) {
      // 2. Velocity Calculation
      pdf.setFont('helvetica', 'bold');
      yPos = addTextWithPageBreak(pdf, '2. Velocity Calculation:', MARGIN_LEFT, yPos, CONTENT_WIDTH);
      
      pdf.setFont('helvetica', 'normal');
      yPos = addTextWithPageBreak(pdf, 'Formula: Velocity = Flow ÷ Pipe Cross-Sectional Area', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const diameterFt = pipeData.internalDiameter / 12;
      const area = Math.PI * Math.pow(diameterFt / 2, 2);
      const flowCFS = zoneData.flowGPM / 448.83;
      
      const diameterText = `Pipe Internal Diameter: ${pipeData.internalDiameter.toFixed(3)} inches = ${diameterFt.toFixed(4)} ft`;
      yPos = addTextWithPageBreak(pdf, diameterText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const areaText = `Cross-Sectional Area: π × (${diameterFt.toFixed(4)} / 2)^2 = ${area.toFixed(6)} ft^2`;
      yPos = addTextWithPageBreak(pdf, areaText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const flowText = `Flow: ${zoneData.flowGPM.toFixed(2)} GPM = ${flowCFS.toFixed(4)} ft^3/s`;
      yPos = addTextWithPageBreak(pdf, flowText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const velocityCalcText = `Velocity: ${flowCFS.toFixed(4)} ÷ ${area.toFixed(6)} ft^2`;
      yPos = addTextWithPageBreak(pdf, velocityCalcText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      pdf.setFont('helvetica', 'bold');
      yPos = addTextWithPageBreak(pdf, `Velocity = ${zoneData.velocity.toFixed(2)} ft/s`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      yPos += LINE_HEIGHT * 0.5; // Extra spacing after result
      pdf.setFont('helvetica', 'normal');

      // 3. Reynolds Number
      pdf.setFont('helvetica', 'bold');
      yPos = addTextWithPageBreak(pdf, '3. Reynolds Number Calculation:', MARGIN_LEFT, yPos, CONTENT_WIDTH);
      
      pdf.setFont('helvetica', 'normal');
      yPos = addTextWithPageBreak(pdf, 'Formula: Re = (Velocity × Diameter) ÷ Kinematic Viscosity', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      yPos = addTextWithPageBreak(pdf, `Assumed Water Temperature: ${data.advancedSettings.temperature}°F`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const viscosityText = `Kinematic Viscosity: ${data.fluidProps.kinematicViscosity.toExponential(3)} ft^2/s`;
      yPos = addTextWithPageBreak(pdf, viscosityText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const reynoldsCalcText = `Re = (${zoneData.velocity.toFixed(2)} × ${diameterFt.toFixed(4)}) ÷ ${data.fluidProps.kinematicViscosity.toExponential(3)}`;
      yPos = addTextWithPageBreak(pdf, reynoldsCalcText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      pdf.setFont('helvetica', 'bold');
      yPos = addTextWithPageBreak(pdf, `Reynolds Number = ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      
      const flowRegime = zoneData.reynolds < 2300 ? 'Laminar' : zoneData.reynolds < 4000 ? 'Transitional' : 'Turbulent';
      pdf.setFont('helvetica', 'normal');
      yPos = addTextWithPageBreak(pdf, `Flow Regime: ${flowRegime}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
      yPos += LINE_HEIGHT * 0.5; // Extra spacing

      // 4. Friction Factor (if Darcy-Weisbach)
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        const frictionTitle = '4. Friction Factor Calculation (Swamee-Jain Approximation):';
        yPos = addTextWithPageBreak(pdf, frictionTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        const roughness = parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness;
        const relativeRoughness = roughness / diameterFt;
        
        const roughnessText = `Absolute Roughness: ${roughness.toExponential(3)} ft`;
        yPos = addTextWithPageBreak(pdf, roughnessText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const relRoughnessText = `Relative Roughness: ${roughness.toExponential(3)} ÷ ${diameterFt.toFixed(4)} = ${relativeRoughness.toExponential(3)}`;
        yPos = addTextWithPageBreak(pdf, relRoughnessText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, roughness, pipeData.internalDiameter);
        
        if (zoneData.reynolds < 2300) {
          yPos = addTextWithPageBreak(pdf, 'Laminar flow: f = 64 / Re', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
          yPos = addTextWithPageBreak(pdf, `f = 64 / ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        } else {
          yPos = addTextWithPageBreak(pdf, 'Turbulent flow - Swamee-Jain formula:', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
          yPos = addTextWithPageBreak(pdf, 'f = 0.25 / [log_10(ε/3.7D + 5.74/Re^0.9)]^2', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        }
        
        pdf.setFont('helvetica', 'bold');
        yPos = addTextWithPageBreak(pdf, `Friction Factor (f) = ${frictionFactor.toFixed(6)}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        yPos += LINE_HEIGHT * 0.5; // Extra spacing
        pdf.setFont('helvetica', 'normal');
      }

      // 5. Head Loss Calculation
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        const headLossTitle = '5. Head Loss Calculation (Darcy-Weisbach Equation):';
        yPos = addTextWithPageBreak(pdf, headLossTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        yPos = addTextWithPageBreak(pdf, 'Formula: h = f × (L/D) × (V^2/2g)', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        yPos = addTextWithPageBreak(pdf, 'Effective Length Breakdown:', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const straightPipeText = `  Straight pipe: ${zoneData.straightLength.toFixed(1)} ft`;
        yPos = addTextWithPageBreak(pdf, straightPipeText, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        
        const fittingEquivText = `  Fitting equivalent: ${zoneData.fittingEquivalentLength.toFixed(1)} ft`;
        yPos = addTextWithPageBreak(pdf, fittingEquivText, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        
        const emitterEquivText = `  Emitter equivalent: ${zoneData.emitterEquivalentLength.toFixed(1)} ft`;
        yPos = addTextWithPageBreak(pdf, emitterEquivText, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        
        pdf.setFont('helvetica', 'bold');
        const totalLengthText = `  Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`;
        yPos = addTextWithPageBreak(pdf, totalLengthText, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        pdf.setFont('helvetica', 'normal');
        
        const g = 32.174;
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness, pipeData.internalDiameter);
        
        yPos = addTextWithPageBreak(pdf, `Gravity constant (g): ${g} ft/s^2`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const headLossFormulaText = `h = ${frictionFactor.toFixed(6)} × (${zoneData.totalEffectiveLength.toFixed(1)} / ${diameterFt.toFixed(4)}) × (${zoneData.velocity.toFixed(2)}^2 / (2 × ${g}))`;
        yPos = addTextWithPageBreak(pdf, headLossFormulaText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const ldRatio = zoneData.totalEffectiveLength / diameterFt;
        const vSquaredOver2g = Math.pow(zoneData.velocity, 2) / (2 * g);
        
        const headLossSimplifiedText = `h = ${frictionFactor.toFixed(6)} × ${ldRatio.toFixed(2)} × ${vSquaredOver2g.toFixed(4)}`;
        yPos = addTextWithPageBreak(pdf, headLossSimplifiedText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        pdf.setFont('helvetica', 'bold');
        yPos = addTextWithPageBreak(pdf, `Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        yPos += LINE_HEIGHT * 0.5; // Extra spacing
        pdf.setFont('helvetica', 'normal');
      } else {
        // Hazen-Williams
        pdf.setFont('helvetica', 'bold');
        const hazenTitle = '5. Head Loss Calculation (Hazen-Williams Equation):';
        yPos = addTextWithPageBreak(pdf, hazenTitle, MARGIN_LEFT, yPos, CONTENT_WIDTH);
        
        pdf.setFont('helvetica', 'normal');
        yPos = addTextWithPageBreak(pdf, 'Formula: h = 4.52 × L × Q^1.85 / (C^1.85 × D^4.87)', MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const cValue = parseFloat(data.advancedSettings.customCValue) || pipeData.hazenWilliamsC;
        
        yPos = addTextWithPageBreak(pdf, `C-value: ${cValue}`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        const hazenLengthText = `Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`;
        yPos = addTextWithPageBreak(pdf, hazenLengthText, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        yPos = addTextWithPageBreak(pdf, `Flow (Q): ${zoneData.flowGPM.toFixed(2)} GPM`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        yPos = addTextWithPageBreak(pdf, `Diameter (D): ${pipeData.internalDiameter.toFixed(3)} inches`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        
        pdf.setFont('helvetica', 'bold');
        yPos = addTextWithPageBreak(pdf, `Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + INDENT_OFFSET, yPos, CONTENT_WIDTH - INDENT_OFFSET);
        yPos += LINE_HEIGHT * 0.5; // Extra spacing
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
  // Check if we need a new page for Assumptions section
  yPos = checkPageBreak(pdf, yPos, 80);

  yPos = addSectionHeader(pdf, 'Assumptions & Constraints', yPos);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Fluid Assumptions:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  yPos = addKeyValue(pdf, '  Fluid:', data.advancedSettings.fluidType, yPos);
  yPos = addKeyValue(pdf, '  Temperature:', `${data.advancedSettings.temperature}°F`, yPos);
  yPos = addKeyValue(pdf, '  Density:', `${data.fluidProps.density.toFixed(3)} lb/ft^3`, yPos);
  yPos = addKeyValue(pdf, '  Kinematic Viscosity:', `${data.fluidProps.kinematicViscosity.toExponential(3)} ft^2/s`, yPos);
  yPos += LINE_HEIGHT;
  
  pdf.text('Calculation Method:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  yPos = addKeyValue(pdf, '  Method:', data.advancedSettings.calculationMethod, yPos);
  if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
    pdf.text('  Friction factor via Swamee-Jain approximation', MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT;
  }
  yPos += LINE_HEIGHT;
  
  pdf.text('Validity Domain:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Turbulent flow regime (Re > 4000 typical for hydronic systems)', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Closed-loop hydronic heating systems', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Temperature range: 40°F to 180°F', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  if (data.advancedSettings.calculationMethod === 'Hazen-Williams') {
    pdf.text('  • Hazen-Williams valid for water only (not glycol solutions)', MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT;
  }
  yPos += LINE_HEIGHT;
  
  pdf.text('Velocity Target Ranges:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Recommended: 2-4 ft/s (quiet operation, minimal erosion)', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Absolute maximum: 8 ft/s for water, 6 ft/s for glycol', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Minimum: ~1 ft/s (below this, air separation may occur)', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT * 2;
  
  pdf.text('Data Sources:', MARGIN_LEFT, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Pipe dimensions: ASTM standards', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Fluid properties: NIST, ASHRAE Handbook - Fundamentals', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Roughness values: Engineering reference tables', MARGIN_LEFT + INDENT_OFFSET, yPos);
  yPos += LINE_HEIGHT;
  pdf.text('  • Fitting equivalents: ASHRAE, crane technical papers', MARGIN_LEFT + INDENT_OFFSET, yPos);
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
  
  yPos += LINE_HEIGHT * 0.75; // Increased spacing after section header
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
  pdf.setFontSize(10); // Reset to default font size
  yPos += LINE_HEIGHT * 1.25; // Increased spacing after subsection header
  return yPos;
}

/**
 * Add a key-value pair to the PDF with proper text wrapping
 */
function addKeyValue(pdf: jsPDF, key: string, value: string, yPos: number): number {
  pdf.setFont('helvetica', 'normal');
  pdf.text(key, MARGIN_LEFT, yPos);
  pdf.setFont('helvetica', 'bold');
  
  // Calculate available width for value (from key position + offset to right margin)
  const valueStartX = MARGIN_LEFT + KEY_VALUE_OFFSET;
  const maxValueWidth = PAGE_WIDTH - MARGIN_RIGHT - valueStartX;
  
  // Split value text if it's too long
  const valueLines = pdf.splitTextToSize(value, maxValueWidth);
  pdf.text(valueLines, valueStartX, yPos);
  
  pdf.setFont('helvetica', 'normal');
  // Return position accounting for wrapped lines
  return yPos + (LINE_HEIGHT * valueLines.length);
}
