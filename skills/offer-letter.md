---
name: offer-letter
description: Generate a formal offer letter for a candidate including salary, equity, and terms.
args: <candidate-name>, <role>, <salary>, <equity>
agents:
  - hiring-agent
gate-type: hire
---

# Skill: offer-letter

## Objective
Generate a formal, legally-safe offer letter that documents offer terms and covers startup basics.

## Inputs
- Args: candidate name, role title, salary amount, equity % (e.g., "Alex Chen, founding engineer, $180K, 0.5%")
- COMPANY.md (legal entity name, address)
- RUNWAY.md (check if hire impacts runway <12 months)
- Team memory: `hiring.comp_ranges.<role>` (validate salary is in range)

## Procedure
1. **Validate budget impact:**
   - Calculate total cost: salary + benefits + equity
   - Check RUNWAY.md: Does this hire push runway below 12 months?
   - If yes: Flag and suggest reducing salary or deferring hire
2. **Verify offer is reasonable:**
   - Is salary in `hiring.comp_ranges` for this role?
   - Is equity in line with stage and role seniority?
3. **Generate offer letter** with:
   - Legal entity name and address
   - Candidate name and role
   - Salary, benefits, equity terms
   - Stock option plan reference
   - Vesting schedule (standard: 4-year, 1-year cliff)
   - Start date
   - At-will employment clause
   - Confidentiality reminder
4. **Gate:** ALWAYS `hire` gate — this cannot be auto-approved

## Output Format
```
---MEMORY_UPDATE---
key: hiring.offers.<candidate_slug>
value: {
  "name": "[Name]",
  "role": "[Role]",
  "salary": [Amount],
  "equity": "[%]",
  "status": "pending_gate_approval",
  "created": "2024-04-06"
}
---END_MEMORY_UPDATE---

---HUMAN_GATE---
gate_type: hire
approval_message: "Approve offer to [Candidate Name] for [Role] at $[Salary]?"
---END_HUMAN_GATE---

**OFFER LETTER**

[Date]

[Candidate Name]
[Address]

**Re:** Offer of Employment

Dear [Candidate Name],

We are pleased to offer you the position of **[Role Title]** at **[Company Legal Name]**, to begin on **[Start Date]**.

## Position Terms

**Title:** [Role Title]
**Department:** [Department]
**Reports to:** [Manager Name]
**Location:** [Remote / On-site]

## Compensation & Benefits

**Base Salary:** $[Salary] per year, payable bi-weekly

**Health & Wellness:**
- Health insurance
- Dental insurance
- Vision insurance
- 401(k) with company match

**Additional Benefits:**
- [Paid time off days] PTO
- $[X] annual professional development budget
- [Other benefits]

## Equity Compensation

You will receive an option to purchase [X]% of [Company Name] common stock, subject to the Company's Stock Option Plan. These options will vest over four (4) years on a monthly basis, with a one (1) year cliff. If your employment terminates before the cliff, all unvested options are forfeited.

## Employment Terms

- **Employment Type:** At-will employment (can be terminated by either party with [X] days notice)
- **Start Date:** [Date]
- **Contingencies:** 
  - Background check clearance
  - Proof of work authorization (Form I-9)

## Confidentiality & IP Assignment

By accepting this offer, you agree to:
- Keep all company information confidential
- Assign all work product and inventions created during employment to the Company
- Review and sign our standard IP Assignment Agreement

## Next Steps

Please confirm your acceptance of this offer by signing below and returning by **[Date]**.

If you have any questions, please contact [Hiring Manager] at [email].

We're excited to have you join the team!

Sincerely,

[CEO Name]
Chief Executive Officer
[Company Name]

---

**Accepted by:**

[Candidate Signature] _________________ [Date] _________

[CEO Signature] _________________ [Date] _________
```

## Example (Founding Engineer)
```
**OFFER LETTER**

April 6, 2024

Alex Chen
San Francisco, CA

**Re:** Offer of Employment — Founding Engineer

Dear Alex,

We are pleased to offer you the position of **Founding Engineer** at **AgentClaw Inc.**

## Position Terms
- **Title:** Founding Engineer
- **Reports to:** Jordan Patel (CTO)
- **Location:** Remote

## Compensation
- **Salary:** $180,000 per year
- **Benefits:** Health/dental/vision, $3K/year dev budget, unlimited PTO

## Equity
- **Option Grant:** 1% of AgentClaw Inc. common stock
- **Vesting:** 4-year vest with 1-year cliff (monthly vesting thereafter)

## Employment Type
At-will employment. Either party may terminate with 2 weeks' notice.

Signature lines...
```
