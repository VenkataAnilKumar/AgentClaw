---
name: cold-email
description: Draft a high-conversion 3-step cold outbound sequence based on ICP and company context.
args: <persona-or-target-account>
agents:
  - gtm-agent
---

# Skill: cold-email

## Objective
Create a personalized outbound sequence aligned with ICP, OKRs, and runway constraints.

## Inputs
- Target persona or account from user request
- Existing memory keys: gtm.icp, gtm.messaging, gtm.objections

## Procedure
1. Validate ICP fit and clarify assumptions.
2. Draft 3 messages:
   - Email 1: pain + relevance
   - Email 2: social proof/value
   - Email 3: close with low-friction CTA
3. Provide subject lines and follow-up timing.
4. Capture reusable signal in memory.

## Output Requirements
- Emit one ARTIFACT with subject lines, sequence, and rationale.
- Emit MEMORY_UPDATE for any durable GTM learnings using gtm.* keys.
