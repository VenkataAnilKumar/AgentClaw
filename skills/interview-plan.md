---
name: interview-plan
description: Structure an interview process for a given role with questions and evaluation framework.
args: <role-title>
agents:
  - hiring-agent
---

# Skill: interview-plan

## Objective
Define a structured interview process — who talks to candidate, what to evaluate, what questions to ask, red flags to watch for.

## Inputs
- Args: role title
- TEAM.md (who are the interviewers?)
- Team memory: `hiring.scorecards.<role>` (if evaluation rubric exists)
- COMPANY.md (what values matter?)

## Procedure
1. **Define interview stages:**
   - Phone screen (30 min): Do basics match? Communication okay?
   - Technical/role-specific (60 min): Can they do the job?
   - Team fit (45 min): Do they match company culture?
   - Founder conversation (30 min): Do we vibe?
2. **Assign interviewers:**
   - Phone screen: Hiring manager
   - Technical: Senior engineer + subject matter expert
   - Team fit: Two teammates from different departments
   - Founder: CEO/CTO
3. **Define evaluation criteria per stage:**
   - What's a green flag (keep going)?
   - What's a yellow flag (dig deeper)?
   - What's a red flag (stop the process)?
4. **Draft sample questions** for each stage relevant to the role
5. **Output:** Interview plan artifact with all stages, scorecards, and questions

## Output Format
```
---MEMORY_UPDATE---
key: hiring.scorecards.<role>
value: {
  "template": "interview_plan",
  "stages": ["phone_screen", "technical", "team_fit", "founder"],
  "created": "2024-04-06"
}
---END_MEMORY_UPDATE---

**Interview Plan: [Role Title]**

## Process Overview
- **Total timeline:** 2 weeks (ideal)
- **Stages:** 4 rounds
- **Decision criteria:** All must be green or yellow (no red flags)

## Stage 1: Phone Screen (30 minutes)
**Interviewer:** [Name, title]
**Goal:** Confirm basics, enthusiasm, communication

**Questions:**
1. Tell us about your background and why [Role] appeals to you?
2. What's your experience with [key skill]?
3. What questions do you have about us?

**Green Flags:** ✅
- Clear communication
- Relevant background
- Genuine curiosity

**Red Flags:** 🚩
- Can't explain background clearly
- Any dishonesty/exaggeration
- No interest in our product

## Stage 2: Technical Interview (60 minutes)
**Interviewers:** [Senior engineer name], [Subject matter expert name]
**Goal:** Assess technical depth and problem-solving

**Technical Challenge:**
[Describe a realistic problem they'd solve on day 1]

**Green Flags:** ✅
- Asks clarifying questions
- Writes clean, readable code/solution
- Explains thought process

**Red Flags:** 🚩
- Rushes without understanding problem
- Code quality below expectation
- Defensive about feedback

## Stage 3: Team Fit (45 minutes)
**Interviewers:** [Teammate 1 name], [Teammate 2 name]
**Goal:** Assess culture alignment and collaboration

**Questions:**
1. Describe a time you disagreed with a coworker. How'd you handle it?
2. What kind of team environment brings out your best work?
3. How do you approach learning new skills on the job?

**Green Flags:** ✅
- Values transparency and feedback
- Takes responsibility
- Growth mindset

**Red Flags:** 🚩
- Blames previous employers
- Defensive or dismissive
- Unwilling to learn

## Stage 4: Founder Conversation (30 minutes)
**Interviewer:** [CEO/CTO name]
**Goal:** Assess long-term fit and company vision alignment

**Questions:**
1. If you succeed in this role, what does that look like in 1 year?
2. What stage of startup appeals to you? Why?
3. What would you create if you could start from scratch here?

**Green Flags:** ✅
- Thinks bigger than the role
- Understands startup nature
- Excited about impact

## Decision Criteria
- All stages yellow or green = **Offer**
- Any red flag = **Reject** (no exceptions)
- Unclear = **Revisit specific area** or escalate to CEO

## Post-Interview
- Debrief all interviewers within 24 hours
- Scorecard completed by each interviewer
- Decision made and communicated within 3 business days
```

## Example (Founding Engineer)
```
**Interview Plan: Founding Engineer**

## Stage 1: Phone Screen
- "Tell about your most complex backend system you've built"
- "Why are you interested in early-stage startups?"
- Check: Communication clear, enthusiasm genuine

## Stage 2: Technical
- Implement a simple agent dispatch system
- Design a database schema for multi-tenant data
- Check: Problem-solving depth, code quality

## Stage 3: Team Fit
- "How do you handle ambiguity in early startups?"
- "Describe a time you learned a new tech stack on the job"
- Check: Growth mindset, team collaboration

## Stage 4: Founder
- "What would you build if starting from scratch?"
- "How do you think about technical debt in early stage?"
- Check: Strategic thinking, alignment with product vision
```
