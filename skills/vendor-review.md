---
name: vendor-review
description: Evaluate a new vendor or renegotiate existing contract — cost, features, alternatives.
args: <vendor-name>
agents:
  - operations-agent
gate-type: spend
---

# Skill: vendor-review

## Objective
Evaluate if a vendor is the right cost/feature fit, or if we should negotiate, switch, or cancel.

## Inputs
- Args: vendor name (e.g., "Outreach", "AWS")
- Team memory: `ops.vendors` (existing vendor data and costs)
- Team memory: `ops.spend` (current spend on similar tools)
- RUNWAY.md (budget to assess impact)

## Procedure
1. **Gather vendor info:**
   - Requested cost (list price, negotiated discount?)
   - Contract length
   - What problem does it solve?
   - Who's the champion (who wants this)?
2. **Competitive analysis:**
   - Research 3–5 alternatives with similar features
   - Compare cost, features, integrations
   - Find "best value" option
3. **Unit economics (if applicable):**
   - How does this impact per-unit cost? (e.g., CAC, per-employee, per-transaction)
   - Payback period? (e.g., sales tool costs $10K, should generate $30K pipeline to justify)
4. **Runway impact:**
   - How many months of runway does this consume?
   - Is it worth it given current cash?
5. **Recommendation:**
   - Approved (cost justified, features fit)
   - Negotiation (try to get better terms before approving)
   - Alternative (recommend cheaper/better option)
   - Reject (not worth it)
6. **Gate:** If >$2K/mo, create `spend` gate for approval

## Output Format
```
---MEMORY_UPDATE---
key: ops.vendor_reviews.[vendor_slug]
value: {
  "vendor": "[Name]",
  "status": "approved|pending_negotiation|alternative_recommended|rejected",
  "cost_monthly": [Amount],
  "recommendation": "[Summary]",
  "reviewed": "[Date]"
}
---END_MEMORY_UPDATE---

[IF COST > $2K/mo] ---HUMAN_GATE---
gate_type: spend
approval_message: "Approve [Vendor] for $[Cost]/mo?"
---END_HUMAN_GATE---

## Vendor Review: [Vendor Name]

### Requested Terms
- **Cost:** $[X]/month (or $[Y]/year)
- **Contract:** [Length] (month-to-month, annual, multi-year)
- **Users/seats:** [N]
- **Champion:** [Who wants this?]

### Problem It Solves
[What gap does this fill? Who benefits?]

### Feature Comparison

| Feature | [Vendor] | Alternative 1 | Alternative 2 | Best |
|---------|----------|---------------|---------------|------|
| [Feature 1] | ✅ | ✅ | ❌ | Tie |
| [Feature 2] | ✅ | ❌ | ✅ | Tie |
| [Feature 3] | Premium | Basic | ✅ | Alt 2 |
| **Cost** | $[X] | $[Y] | $[Z] | Alt 2 |

### Similar Tools (Current Spend)
- [Current tool 1]: $[X]/mo — consider consolidating?
- [Current tool 2]: $[X]/mo — feature overlap?

### Alternatives Evaluated

1. **[Alternative 1]**
   - Cost: $[X]/mo
   - Pros: [2–3 benefits]
   - Cons: [1–2 drawbacks]

2. **[Alternative 2]**
   - Cost: $[X]/mo
   - Pros: [2–3 benefits]
   - Cons: [1–2 drawbacks]

3. **Do Nothing**
   - Cost: $0
   - Impact: [What happens if we don't buy?]

### Runway Impact
- Monthly cost: $[X]
- Annual impact: $[Y]
- Current runway: [N] months
- Runway after this spend: [N-Y/12] months

### Recommendation
**[APPROVED / NEGOTIATE / ALTERNATIVE / REJECT]**

[Summary sentence on why this decision]

**Next steps:**
- [Action 1]
- [Action 2]
```

## Example (Sales Tool)
```
## Vendor Review: Outreach

### Requested Terms
- **Cost:** $10,000/month
- **Contract:** 1-year commitment
- **Seats:** Unlimited
- **Champion:** VP Sales

### Problem
Outreach enables outbound sales cadences, email sequences, and call logging. We need better sales productivity tooling.

### Alternatives
| Feature | Outreach | Salesloft | Lemlist | HubSpot |
|---------|----------|-----------|---------|---------|
| Email sequences | ✅ | ✅ | ✅ | ✅ |
| Call integration | ✅ | ✅ | ❌ | ✅ |
| Dialer | ✅ | ✅ | ❌ | ❌ |
| CRM integration | ✅ | ✅ | ✅ | N/A |
| Cost | $10K | $8K | $1K | $3.2K |

### Runway Impact
- Current burn: $56K/mo
- With Outreach: $66K/mo
- Current runway: 21 months
- After Outreach: 18 months

### Recommendation
**NEGOTIATE**

Outreach is best-in-class but costs 3x Lemlist. For our stage (Series A, 5 SDRs), Lemlist + HubSpot combo ($4.2K/mo) gets us 80% of features for 58% less cost. Negotiation target: $6K/mo or prove ROI (need $30K pipeline to justify).
```
