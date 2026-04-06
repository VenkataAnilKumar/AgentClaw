---
name: jd
description: Draft a complete, startup-appropriate job description for a given role.
args: <role-title>
agents:
  - hiring-agent
---

# Skill: jd

## Objective
Write a practical, stage-appropriate JD that clearly communicates role, requirements, and why someone should join.

## Inputs
- Args: role title (e.g., "founding engineer", "marketing manager")
- TEAM.md (current team structure and size — informs JD context)
- COMPANY.md (company stage, mission, product focus)
- RUNWAY.md (current runway — informs comp range reality check)
- Team memory: `hiring.comp_ranges` (if previous market research exists)

## Procedure
1. **Validate stage appropriateness:**
   - Read RUNWAY.md: If <12 months, flag and suggest delay
   - Read TEAM.md: What department/reporting line?
   - Read COMPANY.md: What does company do? What stage?
2. **Draft JD sections:**
   - **Role summary:** One sentence — what does this person do daily?
   - **Why join:** 2–3 bullets on why *this company* at *this stage*
   - **Responsibilities:** 5–7 bullet points (specific, not generic)
   - **Requirements:** Must-haves (5–7 bullets) vs. Nice-to-haves (3–4)
   - **Compensation range:** Market rate for SF/remote at this stage
     - Seed: $130–180K for IC, $180–220K for manager
     - Series A: $150–200K for IC, $200–250K for manager
   - **Equity range:** Standard for company stage
     - Founding hire: 0.5–2%
     - Engineer hire (Series A): 0.1–0.3%
     - Later hire: 0.05–0.1%
3. **Store comp research** — Upsert to `hiring.comp_ranges`

## Output Format
```
---MEMORY_UPDATE---
key: hiring.comp_ranges.<role>
value: {
  "salary_range": "$150K–$200K",
  "equity_range": "0.1–0.3%",
  "market": "SF/Remote",
  "date": "2024-04-06"
}
---END_MEMORY_UPDATE---

**Job Description: [Role Title]**

## About the Role
[One sentence summary of what this person does]

## Why Join [Company]
- We're a [stage] startup solving [problem]
- You'll [impact statement]
- Our team is [culture descriptor]

## Responsibilities
- [Responsibility 1 — specific and measurable]
- [Responsibility 2]
- [Responsibility 3]
- [Responsibility 4]
- [Responsibility 5]

## Requirements

**Must Have:**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]
- [Requirement 4]
- [Requirement 5]

**Nice to Have:**
- [Bonus skill 1]
- [Bonus skill 2]

## Compensation & Growth
- **Salary:** $[X]–$[Y] (based on experience)
- **Equity:** [%] (subject to vesting schedule)
- **Benefits:** [Health insurance, 401k, etc.]
- **Flexible work:** [Remote policy, hours, etc.]
- **Title & growth:** [Path to next level]

## How to Apply
Contact [hiring contact] at [company]@[domain].com
```

## Example (Founding Engineer)
```
**Job Description: Founding Engineer**

## About the Role
Build the runtime and agent orchestration system that powers our AI agent platform.

## Why Join AgentClaw
- Help founders run companies via autonomous AI — unprecedented product
- Work directly with CTO on architecture; your code shapes the platform
- Seed stage = real equity upside; you'll be employee #2

## Responsibilities
- Design and implement agent runtime and LLM dispatch pipeline
- Own PostgreSQL data model and query performance
- Implement Slack integration and event handling
- Participate in AWS infrastructure and deployment strategy
- Mentor future engineers as we grow

## Requirements
- 5+ years backend software engineering (TypeScript, Python, Go, Rust)
- Experience with production systems at scale
- Comfortable with ambiguity (startup engineering)
- Want to work directly with founding team on product vision

## Compensation & Growth
- **Salary:** $170K–$200K
- **Equity:** 1% (4-year vest, 1-year cliff)
- **Benefits:** Health/dental/vision, $3K/year dev budget
- **Flexible:** Remote-first, 4-day work weeks encouraged
```
