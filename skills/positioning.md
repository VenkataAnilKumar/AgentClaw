---
name: positioning
description: Develop or refine competitive positioning statement and messaging framework.
args: <market-segment-or-update>
agents:
  - gtm-agent
gate-type: strategy
---

# Skill: positioning

## Objective
Create a concise, defensible positioning statement that sales and content can reference consistently.

## Inputs
- COMPANY.md (business model, market focus)
- Team memory: `gtm.icp` (if previously defined)
- Team memory: `gtm.competitors` (if previously analyzed)
- Team memory: `gtm.positioning` (if previous iteration exists)

## Procedure
1. **Validate market context** — Extract target buyer, pain points, and buying process from COMPANY.md
2. **Synthesize differentiation** — Compare against known competitors in team memory
3. **Draft positioning canvas:**
   - **Category:** What are we? (not what we do, but category we own)
   - **Target buyer:** Who feels the pain most acutely?
   - **Problem we solve:** The specific, quantified pain (not our solution)
   - **Our differentiation:** Why us over alternatives (including doing nothing)
   - **Proof points:** Customers, case studies, or metrics validating the claim
4. **Output:** Positioning artifact with all above sections

## Gates
- **Approval:** Always `strategy` gate — founder must approve before messaging goes live
- **Reason:** Wrong positioning kills GTM; right positioning makes everything easier

## Output Format
```
---MEMORY_UPDATE---
key: gtm.positioning
value: {serialized positioning canvas from above}
---END_MEMORY_UPDATE---

**Positioning Canvas**

| Element | Definition |
|---------|-----------|
| **Category** | ... |
| **Target Buyer** | ... |
| **Problem** | ... |
| **Differentiation** | ... |
| **Proof Points** | ... |
```

## Example (for Acme B2B SaaS)
```
Category: Autonomous agent platform for startup operations
Target Buyer: Founder/CEO at Series A–C startups (100–500 employees)
Problem: Operational bottleneck — founders bogged down in GTM/hiring/finance that doesn't scale
Differentiation: Only agents built for startup context (OKRs, runway, team size) — not enterprise
Proof Points: [Will be added after first 3 pilots complete]
```
