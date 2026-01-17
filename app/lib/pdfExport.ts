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
 * Generate PDF report for pump sizing calculator
 */
export async function generatePumpSizingPDF(data: PDFExportData): Promise<void> {
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
  pdf.text('    (Specific heat of water × density × conversion factors)', MARGIN_LEFT + INDENT_OFFSET, yPos);
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
        const warningTitle = '  ⚠ WARNING: Pipe Undersized - Critical Issue';
        const warningLines = pdf.splitTextToSize(warningTitle, CONTENT_WIDTH);
        pdf.text(warningLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * warningLines.length;
        
        pdf.setFont('helvetica', 'normal');
        const warningMsg = `  Load exceeds absolute pipe capacity (${zoneData.capacityCheck.capacityBTUAbsolute.toLocaleString()} BTU/hr)`;
        const warningMsgLines = pdf.splitTextToSize(warningMsg, CONTENT_WIDTH);
        pdf.text(warningMsgLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * warningMsgLines.length;
        pdf.setTextColor(0, 0, 0);
      } else if (zoneData.capacityCheck.exceedsRecommended) {
        yPos += LINE_HEIGHT / 2;
        pdf.setTextColor(180, 120, 0);
        pdf.setFont('helvetica', 'bold');
        const warningTitle = '  ⚠ WARNING: Flow Velocity Exceeds Recommended Limit';
        const warningLines = pdf.splitTextToSize(warningTitle, CONTENT_WIDTH);
        pdf.text(warningLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * warningLines.length;
        
        pdf.setFont('helvetica', 'normal');
        const warningMsg = `  Load exceeds recommended capacity (${zoneData.capacityCheck.capacityBTURecommended.toLocaleString()} BTU/hr)`;
        const warningMsgLines = pdf.splitTextToSize(warningMsg, CONTENT_WIDTH);
        pdf.text(warningMsgLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * warningMsgLines.length;
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
    const heatTransferTitle = '1. Heat Transfer Calculation (GPM from BTU/hr and ΔT):';
    const heatTransferLines = pdf.splitTextToSize(heatTransferTitle, CONTENT_WIDTH);
    pdf.text(heatTransferLines, MARGIN_LEFT, yPos);
    yPos += LINE_HEIGHT * heatTransferLines.length;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text('Formula: GPM = BTU/hr ÷ (500 × ΔT)', MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT;
    
    const substitutionText = `Substituting values: GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ (500 × ${zoneData.effectiveDeltaT.toFixed(1)})`;
    const substitutionLines = pdf.splitTextToSize(substitutionText, CONTENT_WIDTH - INDENT_OFFSET);
    pdf.text(substitutionLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT * substitutionLines.length;
    
    const denominator = 500 * zoneData.effectiveDeltaT;
    const calcText = `GPM = ${zoneData.zoneBTU.toLocaleString()} ÷ ${denominator.toFixed(1)}`;
    const calcLines = pdf.splitTextToSize(calcText, CONTENT_WIDTH - INDENT_OFFSET);
    pdf.text(calcLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
    yPos += LINE_HEIGHT * calcLines.length;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`GPM = ${zoneData.flowGPM.toFixed(2)}`, MARGIN_LEFT + INDENT_OFFSET, yPos);
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
      const velocityFormula = 'Formula: Velocity = Flow ÷ Pipe Cross-Sectional Area';
      const velocityFormulaLines = pdf.splitTextToSize(velocityFormula, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(velocityFormulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * velocityFormulaLines.length;
      
      const diameterFt = pipeData.internalDiameter / 12;
      const area = Math.PI * Math.pow(diameterFt / 2, 2);
      const flowCFS = zoneData.flowGPM / 448.83;
      
      const diameterText = `Pipe Internal Diameter: ${pipeData.internalDiameter.toFixed(3)} inches = ${diameterFt.toFixed(4)} ft`;
      const diameterLines = pdf.splitTextToSize(diameterText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(diameterLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * diameterLines.length;
      
      const areaText = `Cross-Sectional Area: π × (${diameterFt.toFixed(4)} / 2)² = ${area.toFixed(6)} ft²`;
      const areaLines = pdf.splitTextToSize(areaText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(areaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * areaLines.length;
      
      const flowText = `Flow: ${zoneData.flowGPM.toFixed(2)} GPM = ${flowCFS.toFixed(4)} ft³/s`;
      const flowLines = pdf.splitTextToSize(flowText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(flowLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * flowLines.length;
      
      const velocityCalcText = `Velocity: ${flowCFS.toFixed(4)} ÷ ${area.toFixed(6)} ft²`;
      const velocityCalcLines = pdf.splitTextToSize(velocityCalcText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(velocityCalcLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * velocityCalcLines.length;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Velocity = ${zoneData.velocity.toFixed(2)} ft/s`, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * 1.5;
      pdf.setFont('helvetica', 'normal');

      // Check if we need a new page
      // Check if we need a new page before Reynolds calculation
      yPos = checkPageBreak(pdf, yPos, 50);

      // 3. Reynolds Number
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. Reynolds Number Calculation:', MARGIN_LEFT, yPos);
      yPos += LINE_HEIGHT;
      
      pdf.setFont('helvetica', 'normal');
      const reynoldsFormula = 'Formula: Re = (Velocity × Diameter) ÷ Kinematic Viscosity';
      const reynoldsFormulaLines = pdf.splitTextToSize(reynoldsFormula, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(reynoldsFormulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * reynoldsFormulaLines.length;
      
      pdf.text(`Assumed Water Temperature: ${data.advancedSettings.temperature}°F`, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT;
      
      const viscosityText = `Kinematic Viscosity: ${data.fluidProps.kinematicViscosity.toExponential(3)} ft²/s`;
      const viscosityLines = pdf.splitTextToSize(viscosityText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(viscosityLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * viscosityLines.length;
      
      const reynoldsCalcText = `Re = (${zoneData.velocity.toFixed(2)} × ${diameterFt.toFixed(4)}) ÷ ${data.fluidProps.kinematicViscosity.toExponential(3)}`;
      const reynoldsCalcLines = pdf.splitTextToSize(reynoldsCalcText, CONTENT_WIDTH - INDENT_OFFSET);
      pdf.text(reynoldsCalcLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * reynoldsCalcLines.length;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Reynolds Number = ${zoneData.reynolds.toFixed(0)}`, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT;
      
      const flowRegime = zoneData.reynolds < 2300 ? 'Laminar' : zoneData.reynolds < 4000 ? 'Transitional' : 'Turbulent';
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Flow Regime: ${flowRegime}`, MARGIN_LEFT + INDENT_OFFSET, yPos);
      yPos += LINE_HEIGHT * 1.5;

      // 4. Friction Factor (if Darcy-Weisbach)
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        const frictionTitle = '4. Friction Factor Calculation (Swamee-Jain Approximation):';
        const frictionTitleLines = pdf.splitTextToSize(frictionTitle, CONTENT_WIDTH);
        pdf.text(frictionTitleLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * frictionTitleLines.length;
        
        pdf.setFont('helvetica', 'normal');
        const roughness = parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness;
        const relativeRoughness = roughness / diameterFt;
        
        const roughnessText = `Absolute Roughness: ${roughness.toExponential(3)} ft`;
        const roughnessLines = pdf.splitTextToSize(roughnessText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(roughnessLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * roughnessLines.length;
        
        const relRoughnessText = `Relative Roughness: ${roughness.toExponential(3)} ÷ ${diameterFt.toFixed(4)} = ${relativeRoughness.toExponential(3)}`;
        const relRoughnessLines = pdf.splitTextToSize(relRoughnessText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(relRoughnessLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * relRoughnessLines.length;
        
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, roughness, pipeData.internalDiameter);
        
        if (zoneData.reynolds < 2300) {
          const laminarText = 'Laminar flow: f = 64 / Re';
          const laminarLines = pdf.splitTextToSize(laminarText, CONTENT_WIDTH - INDENT_OFFSET);
          pdf.text(laminarLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
          yPos += LINE_HEIGHT * laminarLines.length;
          
          const laminarCalcText = `f = 64 / ${zoneData.reynolds.toFixed(0)}`;
          const laminarCalcLines = pdf.splitTextToSize(laminarCalcText, CONTENT_WIDTH - INDENT_OFFSET);
          pdf.text(laminarCalcLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
          yPos += LINE_HEIGHT * laminarCalcLines.length;
        } else {
          const turbulentText = 'Turbulent flow - Swamee-Jain formula:';
          const turbulentLines = pdf.splitTextToSize(turbulentText, CONTENT_WIDTH - INDENT_OFFSET);
          pdf.text(turbulentLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
          yPos += LINE_HEIGHT * turbulentLines.length;
          
          const formulaText = 'f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re⁰·⁹)]²';
          const formulaLines = pdf.splitTextToSize(formulaText, CONTENT_WIDTH - INDENT_OFFSET);
          pdf.text(formulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
          yPos += LINE_HEIGHT * formulaLines.length;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Friction Factor (f) = ${frictionFactor.toFixed(6)}`, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * 1.5;
        pdf.setFont('helvetica', 'normal');
      }

      // Check if we need a new page
      // Check if we need a new page before head loss calculation
      yPos = checkPageBreak(pdf, yPos, 60);

      // 5. Head Loss Calculation
      if (data.advancedSettings.calculationMethod === 'Darcy-Weisbach') {
        pdf.setFont('helvetica', 'bold');
        const headLossTitle = '5. Head Loss Calculation (Darcy-Weisbach Equation):';
        const headLossTitleLines = pdf.splitTextToSize(headLossTitle, CONTENT_WIDTH);
        pdf.text(headLossTitleLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * headLossTitleLines.length;
        
        pdf.setFont('helvetica', 'normal');
        const darcyFormulaText = 'Formula: h = f × (L/D) × (V²/2g)';
        const darcyFormulaLines = pdf.splitTextToSize(darcyFormulaText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(darcyFormulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * darcyFormulaLines.length;
        
        pdf.text('Effective Length Breakdown:', MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT;
        
        const straightPipeText = `  Straight pipe: ${zoneData.straightLength.toFixed(1)} ft`;
        const straightPipeLines = pdf.splitTextToSize(straightPipeText, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        pdf.text(straightPipeLines, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * straightPipeLines.length;
        
        const fittingEquivText = `  Fitting equivalent: ${zoneData.fittingEquivalentLength.toFixed(1)} ft`;
        const fittingEquivLines = pdf.splitTextToSize(fittingEquivText, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        pdf.text(fittingEquivLines, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * fittingEquivLines.length;
        
        const emitterEquivText = `  Emitter equivalent: ${zoneData.emitterEquivalentLength.toFixed(1)} ft`;
        const emitterEquivLines = pdf.splitTextToSize(emitterEquivText, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        pdf.text(emitterEquivLines, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * emitterEquivLines.length;
        
        pdf.setFont('helvetica', 'bold');
        const totalLengthText = `  Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`;
        const totalLengthLines = pdf.splitTextToSize(totalLengthText, CONTENT_WIDTH - NESTED_INDENT_OFFSET);
        pdf.text(totalLengthLines, MARGIN_LEFT + NESTED_INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * totalLengthLines.length;
        pdf.setFont('helvetica', 'normal');
        
        const g = 32.174;
        const frictionFactor = calculateFrictionFactor(zoneData.reynolds, parseFloat(data.advancedSettings.customRoughness) || pipeData.roughness, pipeData.internalDiameter);
        
        pdf.text(`Gravity constant (g): ${g} ft/s²`, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT;
        
        const headLossFormulaText = `h = ${frictionFactor.toFixed(6)} × (${zoneData.totalEffectiveLength.toFixed(1)} / ${diameterFt.toFixed(4)}) × (${zoneData.velocity.toFixed(2)}² / (2 × ${g}))`;
        const headLossFormulaLines = pdf.splitTextToSize(headLossFormulaText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(headLossFormulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * headLossFormulaLines.length;
        
        const ldRatio = zoneData.totalEffectiveLength / diameterFt;
        const vSquaredOver2g = Math.pow(zoneData.velocity, 2) / (2 * g);
        
        const headLossSimplifiedText = `h = ${frictionFactor.toFixed(6)} × ${ldRatio.toFixed(2)} × ${vSquaredOver2g.toFixed(4)}`;
        const headLossSimplifiedLines = pdf.splitTextToSize(headLossSimplifiedText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(headLossSimplifiedLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * headLossSimplifiedLines.length;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * 1.5;
        pdf.setFont('helvetica', 'normal');
      } else {
        // Hazen-Williams
        pdf.setFont('helvetica', 'bold');
        const hazenTitle = '5. Head Loss Calculation (Hazen-Williams Equation):';
        const hazenTitleLines = pdf.splitTextToSize(hazenTitle, CONTENT_WIDTH);
        pdf.text(hazenTitleLines, MARGIN_LEFT, yPos);
        yPos += LINE_HEIGHT * hazenTitleLines.length;
        
        pdf.setFont('helvetica', 'normal');
        const hazenFormulaText = 'Formula: h = 4.52 × L × Q¹·⁸⁵ / (C¹·⁸⁵ × D⁴·⁸⁷)';
        const hazenFormulaLines = pdf.splitTextToSize(hazenFormulaText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(hazenFormulaLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * hazenFormulaLines.length;
        
        const cValue = parseFloat(data.advancedSettings.customCValue) || pipeData.hazenWilliamsC;
        
        const cValueText = `C-value: ${cValue}`;
        const cValueLines = pdf.splitTextToSize(cValueText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(cValueLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * cValueLines.length;
        
        const hazenLengthText = `Total effective length (L): ${zoneData.totalEffectiveLength.toFixed(1)} ft`;
        const hazenLengthLines = pdf.splitTextToSize(hazenLengthText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(hazenLengthLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * hazenLengthLines.length;
        
        const hazenFlowText = `Flow (Q): ${zoneData.flowGPM.toFixed(2)} GPM`;
        const hazenFlowLines = pdf.splitTextToSize(hazenFlowText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(hazenFlowLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * hazenFlowLines.length;
        
        const hazenDiameterText = `Diameter (D): ${pipeData.internalDiameter.toFixed(3)} inches`;
        const hazenDiameterLines = pdf.splitTextToSize(hazenDiameterText, CONTENT_WIDTH - INDENT_OFFSET);
        pdf.text(hazenDiameterLines, MARGIN_LEFT + INDENT_OFFSET, yPos);
        yPos += LINE_HEIGHT * hazenDiameterLines.length;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Head Loss = ${zoneData.headLoss.toFixed(2)} ft`, MARGIN_LEFT + INDENT_OFFSET, yPos);
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
  // Check if we need a new page for Assumptions section
  yPos = checkPageBreak(pdf, yPos, 80);

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
