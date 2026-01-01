# Colorado Permit & Code Reference Repository

## Overview

The Colorado Permit & Code Reference Repository is a field-ready, human-readable reference system designed for HVAC/Mechanical technicians, estimators, and project planners. This is **not** an automated system or wizard—it's a quick-lookup reference source for Colorado permit requirements, inspection expectations, and applicable codes.

## Purpose

This reference system exists to reduce:
- Failed inspections
- Rework
- Guessing based on outdated memory
- Time lost searching PDFs and municipal websites

**Target response time**: A technician should be able to answer "Do I need a permit for this in this city?" in under 30 seconds.

## Structure

The repository is organized into three main sections:

### 1. Jurisdiction Lookup

Quick access to permit requirements and inspection expectations for specific Colorado cities and counties, including:

- **Permit Requirements**: Residential and commercial permit needs, online application availability, and typical fee ranges
- **Inspection Stages**: Typical inspection points (rough-in, final, etc.)
- **Local Amendments**: Jurisdiction-specific code deviations from state baseline
- **Common Callouts**: Known enforcement tendencies and frequently cited items
- **Contact Information**: Phone numbers, websites, and permit office addresses

#### Covered Jurisdictions

Major cities and counties currently included:
- Denver (City and County)
- Colorado Springs
- Boulder
- Aurora
- Fort Collins
- Jefferson County
- Arapahoe County
- Pueblo

### 2. State Code Baseline

The default Colorado statewide requirements, including:

- **Adopted Codes**: Current editions of IMC, IFGC, IECC, NEC (relevant to HVAC)
- **Statewide Amendments**: Colorado-specific overrides to base code language
- **General Requirements**: Permit and inspection requirements unless a jurisdiction differs

This section defines the baseline assumption. Local jurisdictions may have stricter requirements.

### 3. Common Code Callouts

Real-world, field-tested information about:

- **Frequently Cited Violations**: Organized by category (combustion air, venting, gas piping, etc.)
- **Risk Levels**: High, medium, and low risk categorization
- **Prevention Strategies**: How to avoid common mistakes
- **Inspection Notes**: What inspectors specifically look for

Categories covered:
- Combustion Air (High Risk)
- Venting & Chimneys (High Risk)
- Equipment Access & Clearances (Medium Risk)
- Gas Piping (High Risk)
- Ductwork (Medium Risk)
- Condensate Drainage (Medium Risk)
- Electrical & Controls (Medium Risk)
- Refrigerant Lines (Low Risk)
- Seismic Restraints (Medium Risk)

## Data Organization

All reference data is stored in JSON format in `/public/permits-data/`:

- `colorado-baseline.json` - Statewide code baseline
- `jurisdictions.json` - City and county specific information
- `common-callouts.json` - Code violations and inspection callouts

## Tone & Design Principles

- **Plain Language**: No legal jargon
- **Technician-Friendly**: Written for field use
- **Quick Reference**: Designed for speed, not narrative
- **Real-World Focus**: Based on actual inspection behavior, not theoretical code trivia

## Explicit Non-Goals

This reference system does NOT:
- ❌ Automate permit filing
- ❌ Provide AI interpretation
- ❌ Guess jurisdiction requirements
- ❌ Compare national codes
- ❌ Offer code enforcement advice beyond documented requirements

**This is reference, not authority.** Always verify requirements with the local Authority Having Jurisdiction (AHJ).

## Usage

Access the permits reference through the application navigation menu. The interface provides three views:

1. **Jurisdiction Lookup**: Search and select a city/county for detailed requirements
2. **State Code Baseline**: View Colorado's statewide adopted codes and amendments
3. **Common Callouts**: Browse frequent violations and prevention strategies

## Updates and Maintenance

The reference data should be updated when:
- Code adoption cycles occur (typically every 3 years)
- Jurisdictions change permit requirements
- New enforcement patterns are identified
- Additional jurisdictions need to be added

**Current Version**: 1.0.0  
**Last Updated**: 2026-01-01

## Scope Limitations

- **Geographic**: Colorado only. No other states.
- **Discipline**: HVAC/Mechanical focus with relevant fuel gas, plumbing, and electrical intersections
- **Completeness**: Coverage will expand over time. Not all Colorado jurisdictions are currently included.

## Success Criteria

A successful implementation allows users to:
1. Quickly determine permit requirements for a specific jurisdiction
2. Understand differences between Denver, Boulder, Colorado Springs, and other cities
3. Access the state code baseline for comparison
4. Find common violation information to prevent failed inspections
5. Easily update information as codes change

## Contributing

To add or update jurisdiction information:

1. Edit the appropriate JSON file in `/public/permits-data/`
2. Follow the existing data structure
3. Verify accuracy with official jurisdiction sources
4. Update the `last_updated` field
5. Test the changes in the application

## Disclaimer

This reference repository is provided for informational purposes only. It is not a substitute for:
- Official code books and amendments
- Professional code interpretation
- Jurisdiction-specific guidance from the Authority Having Jurisdiction (AHJ)
- Licensed design professional services

**Always verify requirements with your local jurisdiction before beginning work.**

## Contact & Resources

For questions about this reference system, consult with local building departments or professional code experts.

### Useful Colorado Resources

- Colorado Division of Fire Prevention and Control (code adoption)
- Local building department websites (linked in jurisdiction data)
- ICC (International Code Council) for base code information

---

**Remember**: This is a reference tool to support your work, not replace proper due diligence and communication with local authorities.
