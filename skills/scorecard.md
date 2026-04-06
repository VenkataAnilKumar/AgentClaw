---
name: scorecard
description: Create evaluation rubric for candidate assessment across key competencies.
args: <role-title>
agents:
  - hiring-agent
---

# Skill: scorecard

## Objective
Define evaluation rubric with clear 1–5 definitions per competency — enables consistency across all interviewers.

## Inputs
- Args: role title
- COMPANY.md (what values matter?)
- Team memory: `hiring.scorecards.<role>` (if scorecard exists, refine it)

## Procedure
1. **Identify 5–6 key competencies** for the role:
   - For engineering: Technical depth, system design, communication, ownership, learning agility
   - For sales: Persistence, discovery skills, close ability, EQ, product knowledge
   - For ops: Organization, attention to detail, proactivity, problem-solving, communication
2. **Define 1–5 scale for each:**
   - 1 = Deal-breaker (well below needed)
   - 2 = Weak (not ready for this role)
   - 3 = Acceptable (meets baseline)
   - 4 = Strong (exceeds expectations)
   - 5 = Exceptional (top 10% we've met)
3. **Write specific behaviors** for each level:
   - Not abstract ("communication" is vague)
   - Behavioral ("Explains technical approach clearly, answers questions without getting defensive")
4. **Store in memory** — Upsert to `hiring.scorecards.<role>`
5. **Output:** Scorecard artifact for all interviewers to use

## Output Format
```
---MEMORY_UPDATE---
key: hiring.scorecards.<role>
value: {
  "competencies": [...],
  "rubric": {...},
  "created": "2024-04-06"
}
---END_MEMORY_UPDATE---

**Scorecard: [Role Title]**

Each interviewer rates candidate 1–5 on each competency. Average score across all interviewers:
- 4.5–5.0 = Offer
- 3.5–4.4 = Strong candidate (revisit if red flag)
- 2.5–3.4 = Borderline (escalate to CEO)
- <2.5 = Reject

## Competency Rubric

### 1. Technical Depth
| Level | Behavior |
|-------|----------|
| 5 | Explains complex systems with clarity; asks probing questions; identifies edge cases immediately |
| 4 | Solid technical foundation; understands trade-offs; needs minor guidance |
| 3 | Can implement assigned work; basic understanding of fundamentals |
| 2 | Struggles with core concepts; requires heavy guidance |
| 1 | Cannot explain basic technical concepts |

### 2. System Design
| Level | Behavior |
|-------|----------|
| 5 | Thinks about scale, trade-offs; proposes multiple approaches; considers failure modes |
| 4 | Can design systems under guidance; thinks about scalability |
| 3 | Can implement systems; design thinking basic |
| 2 | Focuses on "getting it done" — not thinking ahead |
| 1 | No design thinking; hacks solutions |

### 3. Communication
| Level | Behavior |
|-------|----------|
| 5 | Explains ideas with clarity; listens actively; asks for feedback; articulates tradeoffs |
| 4 | Communicates well; generally clear; can be verbose |
| 3 | Acceptable communication; minor clarity issues |
| 2 | Often unclear or defensive when questioned |
| 1 | Cannot articulate ideas; dismissive of feedback |

### 4. Ownership
| Level | Behavior |
|-------|----------|
| 5 | Takes full accountability; follows through; escalates early; drives to completion |
| 4 | Owns assigned work; checks in; usually follows through |
| 3 | Does assigned work; waits for direction |
| 2 | Waits for detailed guidance; doesn't self-start |
| 1 | Avoids responsibility; blames others |

### 5. Learning Agility
| Level | Behavior |
|-------|----------|
| 5 | Quickly picks up new tech; asks good questions; applies learnings immediately |
| 4 | Learns new techs well; can ramp quickly on codebases |
| 3 | Can learn; may need extra time or guidance |
| 2 | Struggles to learn new tech without heavy support |
| 1 | Defensive about knowledge gaps |

## Scoring Sheet (Use During Interview)

| Competency | Phone | Technical | Team | Founder | **Average** |
|------------|-------|-----------|------|---------|-----------|
| Technical Depth | — | 4 | — | — | **4** |
| System Design | — | 5 | — | — | **5** |
| Communication | 5 | 4 | 4 | 5 | **4.5** |
| Ownership | — | — | 5 | 5 | **5** |
| Learning Agility | — | — | 5 | 4 | **4.5** |
| **AVERAGE** | | | | | **4.6** → **OFFER** |
```
