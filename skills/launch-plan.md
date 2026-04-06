---
name: launch-plan
description: Generate go-to-market launch plan for a new feature, product, or company milestone.
args: <feature-or-product-name>
agents:
  - gtm-agent
gate-type: strategy
---

# Skill: launch-plan

## Objective
Structured 30/60/90-day launch plan with channels, messaging, timeline, and success criteria.

## Inputs
- Args: feature/product name
- COMPANY.md (positioning, target market, stage)
- OKR.md (current quarterly goals)
- RUNWAY.md (budget available for launch spend)
- Team memory: `gtm.icp` (buyer profile)
- Team memory: `gtm.positioning` (key messages to use)

## Procedure
1. **Validate launch scope:**
   - Is this internal feature, external announcement, or major company milestone?
   - What OKR does this support?
   - What's the target outcome? (signups, enterprise pilots, revenue)
2. **Check budget** — Confirm RUNWAY.md has runway to cover launch spend (expect $2–5K for startup launch)
3. **Map go-to-market channels:**
   - Outbound (email, LinkedIn, cold outreach)
   - Content (blog, comparison posts, SEO)
   - Inbound (product-led growth, free trial)
   - Partnerships (influencers, communities, joint webinars)
4. **Build 30/60/90-day timeline:**
   - Day 0–30: Prep (messaging, collateral, partner outreach)
   - Day 30–60: Launch (all channels go live simultaneously)
   - Day 60–90: Optimize (analyze results, adjust spend, double down on winners)
5. **Define success metrics:**
   - Traffic targets
   - Conversion rates per channel
   - Cost per acquisition acceptable for product stage
   - Revenue or pilot targets
6. **Output:** Launch plan artifact with all sections

## Gates
- If launch involves **paid media spend >$1,000/month** or strategic partnerships: requires `strategy` gate
- Otherwise: informational only (no gate)

## Output Format
```
**GO-TO-MARKET LAUNCH PLAN: [Feature/Product]**

## Executive Summary
- Target launch date: [DATE]
- Expected cost: $[X]
- Success metric: [Y]
- Owner: [Person from TEAM.md]

## Positioning & Messaging
[Copy key points from gtm.positioning memory or draft new angle]

## Launch Channels

### Outbound
- Email sequence to [N] leads
- LinkedIn posts from founders
- Cold calls to [N] top prospects

### Content
- Blog post: [Title]
- SEO play: target keyword [keyword]
- Comparison post vs. [competitor]

### Inbound
- Landing page updates
- Free trial promotion
- Product in-app messaging

### Partnerships
- [Partner name 1]
- [Partner name 2]

## 30/60/90 Day Timeline

### Days 0–30 (Prep)
- [ ] Finalize messaging
- [ ] Design collateral
- [ ] Build landing page
- [ ] Set up tracking (UTM, analytics)

### Days 30–60 (Launch)
- [ ] Send outbound emails
- [ ] Publish blog post
- [ ] Launch paid ads
- [ ] Activate partnerships

### Days 60–90 (Optimize)
- [ ] Analyze channel performance
- [ ] Cut low-ROI channels
- [ ] Double down on winners
- [ ] Gather customer testimonials

## Success Criteria

| Metric | Target |
|--------|--------|
| Traffic | 1,000+ visits |
| Conversion to trial | 10% |
| Signups | 100+ |
| Paid CAC | <$50 |

## Budget Breakdown

| Item | Cost |
|------|------|
| Paid ads | $2,000 |
| Content/design | $1,000 |
| Tools/tracking | $500 |
| **Total** | **$3,500** |
```
