---
name: icp
description: Define or refine ideal customer profile for startup GTM execution.
args: <product-or-segment>
agents:
  - gtm-agent
---

# Skill: icp

## Objective
Build a practical ICP that can be used immediately by outbound and content motions.

## Inputs
- COMPANY.md target market and business model
- OKR.md revenue and activation goals
- Existing memory key gtm.icp (if present)

## Procedure
1. Synthesize firmographic and behavioral fit criteria.
2. Define top pain points, buying triggers, and disqualifiers.
3. Map primary persona, champion, and economic buyer.
4. Identify 3 positioning hooks and 3 objections.

## Output Requirements
- Emit one ARTIFACT with ICP table and anti-ICP section.
- Emit MEMORY_UPDATE for gtm.icp and any stable sub-keys.
- If ICP direction changes strategy materially, emit HUMAN_GATE strategy.
