# LinkedIn Content Strategy — AI Automation Engineer

Content system for LinkedIn. Purpose: build visibility, authority, and connections
with US technical recruiters, founders, and engineering teams.

---

## Content Pillars

### 1. Build Logs (50% of posts)

**Purpose:** Show work in progress, systems built, architectural decisions.

**Topics:**
- Systems built (Lead Qualification, Voice Receptionist, WhatsApp, Appointment)
- Architecture decisions and trade-offs
- Problems encountered and solved during implementation
- Integration patterns (webhook, CRM sync, API design)
- Stack-specific insights (n8n, Node.js, PostgreSQL, Docker)

**Tone:** First-person, narrative, technical but accessible.

### 2. Technical Deep Dives (25% of posts)

**Purpose:** Establish authority on specific patterns.

**Topics:**
- Idempotent workflow design
- Webhook reliability patterns (Fast-ACK, deduplication)
- Human-in-the-loop architecture
- API integration best practices
- Input sanitization at gateway
- Structured logging for automation

**Tone:** Educational, pattern-focused.

### 3. Architecture Posts (15% of posts)

**Purpose:** Visual differentiation — automation diagrams stand out on LinkedIn.

**Topics:**
- System flow diagrams from the portfolio
- Component breakdowns
- Data flow explanations
- Trade-off analysis

**Tone:** Visual-first, explanatory.

### 4. Career / Learning Journey (10% of posts)

**Purpose:** Human connection. Show the person behind the systems.

**Topics:**
- Learning journey (n8n, AI, Node.js, DevOps)
- Building a public portfolio
- Transitioning into AI automation
- Lessons from building production systems

**Tone:** Authentic, growth-focused.

---

## Publishing Schedule

### Weekly cadence (1-2 posts/week)

| Day | Type | Rationale |
|-----|------|-----------|
| Tuesday | Build Log or Technical Deep Dive | Highest B2B tech engagement mid-week |
| Thursday (optional) | Architecture or Career | Secondary slot |

### Best posting times (USA market)
- 9:00-11:00 AM CT — matches East Coast working hours
- 12:00-1:00 PM CT — lunch break engagement

---

## Post Templates

### Template 1: Build Log

```
[HOOK — problem statement]

I built [system] that [solves problem].

[Problem — 2-3 lines]
[Describe the manual process or gap]

[Architecture — 3-5 lines]
[How it works, step by step. Include emoji flow if possible.]

Stack: n8n · [Tool 2] · [Tool 3]

[Technical decisions — 2-3 lines]
- Why I chose [pattern] over [alternative]
- How I handled [edge case or reliability concern]

[CTA]
If you're building similar systems, let's connect.

[2-3 hashtags]
```

### Template 2: Technical Deep Dive

```
[HOOK]
Why [pattern] matters in AI automation.

[Problem — 2-3 lines]
What happens without this pattern.

[Explanation — 3-5 lines]
How it works, plain language first, then technical.

[Example — 3-5 lines]
In my [project], I applied this by [specific implementation].

[Lesson — 1-2 lines]
Key takeaway.

[CTA]
What patterns do you use in your automation systems?

[2-3 hashtags]
```

### Template 3: Architecture Breakdown

```
[HOOK]
Here's how [system] works end-to-end.

[Overview — 2 lines]
What it does and who it serves.

[Components — 4-6 lines]
1. [Component] — [role]
2. [Component] — [role]

[Data flow — 3-5 lines]
Input → [Step 1] → [Step 2] → Output

[Trade-offs — 2-3 lines]
- Chose [X] over [Y] because [reason]

[CTA]
What would you build differently?

[2-3 hashtags]
```

---

## First 10 Post Ideas

| # | Title | Type | Keywords |
|---|-------|------|----------|
| 1 | I built an AI lead qualification system with n8n, OpenAI and HubSpot. Here's the architecture. | Build Log | n8n, Lead Qualification, OpenAI, HubSpot, AI Automation |
| 2 | Why idempotency is non-negotiable in AI automation workflows | Deep Dive | Idempotent, Webhook, Data Integrity, Automation |
| 3 | How I designed a bilingual AI voice receptionist that handles EN/ES calls | Build Log | Voice AI, Twilio, Conversational AI, Bilingual, n8n |
| 4 | The webhook reliability pattern I use in every automation project | Deep Dive | Webhook, API, Event-driven, Automation |
| 5 | Architecture breakdown: Event-driven lead pipeline from webhook to CRM sync | Architecture | Event-driven, CRM Integration, Pipeline |
| 6 | How I handle message deduplication in WhatsApp automation | Deep Dive | WhatsApp, Twilio, Fast-ACK, Deduplication |
| 7 | Building a WhatsApp ecommerce agent: Fast-ACK protocol and controlled human handoff | Build Log | WhatsApp, Ecommerce, Conversational AI |
| 8 | Human-in-the-loop: Where to draw the line between automation and human judgment | Deep Dive | Human-in-the-loop, Workflow Design |
| 9 | Idempotent CRM sync: Handling retries without duplicating data | Deep Dive | CRM Integration, Idempotent, Data Sync |
| 10 | What I learned building 4 production-style AI automation systems from scratch | Career Journey | AI Automation, Portfolio, Engineering, n8n |

---

## Content Pipeline

```
Project completed / Pattern learned
        ↓
Update portfolio documentation
        ↓
Extract 1-3 technical takeaways
        ↓
Write post using template
        ↓
Apply Content Verification Rules
        ↓
Publish on Tuesday
        ↓
Engage with comments (48h)
        ↓
Log in content-log.md
```

### Content triggers

| Event | Action |
|-------|--------|
| New project added to portfolio | Write Build Log + Architecture post |
| New technical pattern discovered | Write Deep Dive post |
| New certification earned | Write Career Journey post |
| Monthly (no events) | Learning reflection post |

Avoid publishing without a meaningful technical insight, project update, or learning milestone.

---

## Content Verification Rules

Every post must pass these checks before publishing:

### Prohibited
- ❌ Invented clients, companies, or users
- ❌ Unverifiable business metrics (percentages, revenue, user counts)
- ❌ Commercial outcome claims ("helped increase sales", "reduced costs by X%")
- ❌ Claims not backed by portfolio evidence
- ❌ Exaggerated or hype language

### Required
- ✅ Stack mentioned must be verifiable from GitHub portfolio
- ✅ Architecture claims must match documented systems
- ✅ Technical patterns must be real and applied
- ✅ Designed with production-oriented patterns such as reliability, error handling, and observability
- ✅ Preferred: technical descriptions, architecture decisions, patterns used

### Tone rules
- First-person, narrative style
- Technical but accessible to non-experts
- Honest about trade-offs and challenges
- No buzzwords without context
- 2-3 hashtags per post maximum

---

## Hashtag Strategy

Primary (every post):
- #AIAutomation #n8n #WorkflowAutomation

Secondary (per-post, pick 1-2):
- #APIIntegration #CRMAutomation #VoiceAI #Webhooks
- #ConversationalAI #HumanInTheLoop #EventDriven

Max 3 hashtags per post to avoid LinkedIn penalty.
