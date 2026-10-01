# Medieval Metaphor Design: The Sorting Scribe

## 1. THE METAPHOR CONCEPT

**"The Kingdom of Decisions"**

Every day, thousands of messages, requests, and decisions arrive at the castle gates. Some are routine (the king's letters always go to the throne room). Some are urgent crises (a dragon sighting needs the Court Wizard). Some are trivial (a merchant's invoice gets stamped and filed). And some require the king's own judgment (a border dispute between two lords).

The kingdom has a **decision-making hierarchy**, and every request must pass through it. The problem: without proper triage, the wrong people spend time on the wrong things. The Court Wizard wastes hours reading routine invoices. The king drowns in simple requests. The kingdom slows to a crawl.

**The fix: The Sorting Scribe.** A small, fast character stationed at the gate who reads each incoming message, applies simple rules, and routes it to exactly the right person. No deep reasoning. No expensive magic. Just fast, structured sorting.

This is **classification technology** — a 40-200x faster, 100x cheaper triage layer that handles structured decisions before they ever reach the LLM or human.

---

## 2. CHARACTER NAMES AND ROLES

### 👑 The King — Human Judgment
- **Role:** Final arbiter. Makes judgment calls no one else can.
- **Strength:** Wisdom, nuance, moral reasoning, context from lived experience.
- **Weakness:** Slow, expensive (the kingdom's most valuable resource), can only handle one decision at a time.
- **Visual:** Sitting on a throne, hand on chin, weighing two scrolls. Tiny crown, oversized robes. A desk piled with important letters.
- **Medieval parallel:** The monarch who must personally settle disputes, approve declarations, and make rulings that define precedent.

### 🧙‍♂️ The Court Wizard — LLM Agent
- **Role:** Reasoning powerhouse. Can handle any ambiguous, complex, or creative decision.
- **Strength:** Understands nuance, can reason across domains, handles novel situations.
- **Weakness:** Expensive (burns magical resources for every spell), slow (conjuring takes time), overkill for simple tasks.
- **Visual:** Robed figure with glowing staff, surrounded by floating symbols and open books. Mid-gesture, casting a complex spell.
- **Medieval parallel:** The court sorcerer who can solve any problem — but every spell costs rare components and takes hours to cast.

### 📜 The Sorting Scribe — Classification (NEW)
- **Role:** Fast triage. Reads incoming decisions, applies a rulebook, routes to the right handler.
- **Strength:** Incredibly fast (reads a message in a heartbeat), cheap (ink and parchment only), deterministic (same input = same route every time).
- **Weakness:** Can only classify within its training categories. Doesn't reason — just matches patterns. Can't handle truly novel situations.
- **Visual:** Small figure at the castle gate, standing at a wooden desk. Quick hands stamping scrolls with colored wax seals. A rulebook open beside them. Arrows/paths radiating outward to the King, Wizard, and Automaton.
- **Medieval parallel:** The gate clerk who sorts the kingdom's incoming mail — routine bills go to the accounting office, urgent matters go to the Wizard, and only the truly important reach the King.

### ⚙️ The Clockwork Automaton — Script/Code
- **Role:** Deterministic execution. Does exactly one thing, perfectly, every time.
- **Strength:** Fast, reliable, never tires, zero cost after construction.
- **Weakness:** Can't adapt. If the input doesn't match its programming, it jams. No reasoning, no creativity.
- **Visual:** Mechanical figure made of gears and cogs, arm extended in a fixed action (stamping, filing, hammering). Sparks of efficiency flying off it.
- **Medieval parallel:** A water wheel or mechanical loom — built for one task, impossibly efficient at it, useless for anything else.

---

## 3. THE NARRATIVE ARC

### Act 1: The Kingdom in Chaos
> Before the Sorting Scribe, every decision arrived at the throne room. The King spent his mornings sorting invoices. The Court Wizard was summoned to read weather reports. The Clockwork Automaton sat idle because no one told it what to do. The kingdom ran on human judgment for everything — and it was drowning.

### Act 2: The Three Knights (Existing Metaphor)
> The kingdom had three specialized knights:
> - **Sir Planner** — planned campaigns and strategies (human judgment)
> - **Sir Sharpener** — refined plans and found edge cases (LLM reasoning)
> - **Sir Victor** — executed the final action (deterministic scripts)
>
> But even with three knights, the system was slow. Every decision, no matter how trivial, had to go through the full chain. A simple "is this letter urgent?" question took the same time as a complex diplomatic negotiation.

### Act 3: The Sorting Scribe Arrives
> Then came the Sorting Scribe — a small, fast figure stationed at the gate. Not a knight. Not a wizard. Just a clerk with a rulebook and colored stamps.
>
> The Scribe didn't *solve* decisions. It *sorted* them. And suddenly, 80% of the kingdom's incoming work never reached the King or Wizard at all.
>
> **The rulebook was simple:**
> - 🔴 Red stamp → King's judgment required
> - 🟣 Purple stamp → Court Wizard's reasoning needed
> - 🟢 Green stamp → Automaton handles it
> - 🟡 Yellow stamp → Already decided, file and forget

### Act 4: The New Efficiency
> With the Sorting Scribe in place:
> - The King only saw decisions that truly required human judgment
> - The Court Wizard only cast spells for ambiguous, complex reasoning
> - The Clockwork Automaton handled routine tasks at near-zero cost
> - The Sorting Scribe processed 80% of decisions in the time it took to read a single line
>
> **The kingdom didn't just get faster. It got smarter about where it spent its most valuable resources.**

---

## 4. CONCRETE EXAMPLES

### Example 1: Customer Support Tickets

| Medieval Scene | Tech Reality |
|---|---|
| A merchant sends a complaint about damaged goods. The Sorting Scribe reads it, sees "damaged," "refund," and a receipt number. **Green stamp** → Automaton processes the refund automatically. | An e-commerce support ticket contains structured data (order #, complaint type, item). Classification model tags it as "refund-eligible" → automated refund pipeline handles it. No human or LLM needed. |
| A nobleman writes a letter about a land dispute with his neighbor. The Scribe reads it, finds no matching rule, no structured data — just a story. **Red stamp** → Goes to the King for personal judgment. | A complex customer complaint involves subjective experience, emotional context, and no clear-cut policy. Classification can't handle it → routes to human support agent. |
| A merchant asks whether a new tax applies to his goods. The Scribe sees a policy question with clear parameters. **Purple stamp** → Court Wizard researches and reasons through the tax code. | A customer asks a nuanced question about product eligibility under new regulations. Classification identifies it as "policy-reasoning-required" → LLM agent researches and formulates an answer. |

### Example 2: Email Spam Filtering

| Medieval Scene | Tech Reality |
|---|---|
| A letter arrives written in a foreign tongue, promising gold in exchange for a small fee. The Scribe recognizes the pattern, stamps it **green** → Automaton shreds it. | Spam email matches known patterns (sender reputation, content keywords, header analysis). Classification model tags as "spam" → auto-deleted. |
| A letter from a known ally, with the correct seal and handwriting. **Yellow stamp** → Filed directly. Known good sender, no review needed. | Whitelisted sender with authenticated headers → automatically classified as "safe" and delivered. |
| A letter from an unknown merchant with a plausible but unusual request. **Purple stamp** → Wizard analyzes whether it's a scam or a genuine business proposal. | Phishing email with sophisticated social engineering. Classification uncertain (0.65 confidence) → LLM agent analyzes the full context and intent. |

### Example 3: Network Traffic Routing

| Medieval Scene | Tech Reality |
|---|---|
| A courier arrives with a standard trade manifest. The Scribe stamps it **green** → Automaton files it and opens the trade gate. | Standard HTTP request to a known API endpoint. Classification tags as "routine" → automated pipeline handles it. |
| A rider arrives bearing a sealed royal letter. The Scribe stamps it **red** → Delivered directly to the King's hand. | Critical system alert (security breach, data loss). Classification tags as "critical-human-required" → escalates to on-call engineer. |
| A mysterious courier with a letter in an unfamiliar script. The Scribe can't classify it → **purple stamp** → Wizard examines it to determine origin and intent. | Novel network traffic pattern. Classification model has low confidence → LLM agent analyzes packet structure and context to determine if it's benign or malicious. |

### Example 4: Code Review Triage

| Medieval Scene | Tech Reality |
|---|---|
| A scribe submits a petition to add a new tax. The Sorting Scribe reads the proposal, matches it to "tax-related" category. **Purple stamp** → Wizard reviews the economic implications. | A pull request modifies business logic. Classification tags as "business-logic-change" → LLM agent reviews for correctness and edge cases. |
| A carpenter submits plans to repair a broken gate. The Scribe reads it, sees it's a simple repair following existing blueprints. **Green stamp** → Automaton applies the standard repair template. | A pull request updates a dependency version. Classification tags as "dependency-update" → automated CI/CD pipeline handles it with standard tests. |
| A petitioner submits something the Scribe has never seen before — a completely new type of request. **Red stamp** → The King must decide how to categorize it for the future. | A pull request introduces an entirely new architectural pattern. Classification can't categorize it → routes to human architect for review and to update the classification rules. |

### Example 5: Document Processing

| Medieval Scene | Tech Reality |
|---|---|
| A tax document arrives. The Scribe reads the header, sees "Annual Tax Return," and stamps it **green** → Automaton extracts the numbers and files them. | A structured PDF (invoice, tax form, receipt) arrives. Classification tags document type → OCR + field extraction pipeline processes it automatically. |
| A handwritten letter from a distant province arrives with no standard format. **Purple stamp** → Wizard reads it carefully, extracts meaning, and determines next steps. | An unstructured email with ambiguous intent. Classification uncertain → LLM agent reads the full text, extracts action items, and drafts a response. |

---

## 5. THE KEY INSIGHT (For the Blog Post)

**Classification isn't a replacement for the King, Wizard, or Automaton. It's the gatekeeper that decides who does what.**

Without the Sorting Scribe:
- 100% of decisions hit the King or Wizard (expensive, slow)
- The Automaton sits idle because nothing reaches it

With the Sorting Scribe:
- 80% of decisions get routed to the cheapest/fastest handler
- The King only judges what truly needs judgment
- The Wizard only casts spells that require reasoning
- The Automaton handles everything it can

**This is the Skill Growth Stages pyramid in action:**

```
        👑 King (Human)
       ┌─────────────┐
       │  JUDGMENT   │  ← Only 5% of decisions reach here
       └──────┬──────┘
              │
       🧙‍♂️ Wizard (LLM Agent)
      ┌───────────────┐
      │   REASONING   │  ← Only 15% need this
      └───────┬───────┘
              │
      📜 Sorting Scribe (Classification)
     ┌─────────────────┐
     │     TRIAGE      │  ← 80% of decisions handled here
     └────────┬────────┘
              │
       ⚙️ Automaton (Script/Code)
      ┌───────────────┐
      │  EXECUTION    │  ← Deterministic, cheap, fast
      └───────────────┘
```

---

## 6. BLOG POST TITLE OPTIONS

1. **"The Sorting Scribe: Why Your AI Castle Needs a Gatekeeper"**
2. **"Before You Summon the Wizard: The Case for Classification-First AI"**
3. **"The Missing Layer: How Classification Changes the AI Hierarchy"**
4. **"Every Kingdom Needs a Sorting Scribe"**
5. **"The 80% Solution: Why Most AI Decisions Don't Need an LLM"**

---

## 7. VISUAL DIRECTION (For Design)

The medieval metaphor should be rendered as small, whimsical characters on the page:
- **Tiny pixel-art or hand-drawn style characters** (think medieval manuscript marginalia)
- **The Sorting Scribe** at the center/gate, with colored paths radiating outward
- **Animated feel** — Scribe's hand stamping, paths lighting up as decisions flow
- **The King** at the top, barely visible (rarely needed)
- **The Wizard** in the middle, casting occasional spells
- **The Automaton** at the bottom, gears turning steadily
- **Color coding:** Red (King), Purple (Wizard), Green (Automaton), Yellow (Already decided)

---

## 8. TONE & VOICE

- **Accessible but not dumbed down** — the metaphor does the heavy lifting
- **Concrete over abstract** — every concept gets a real-world example
- **Wry, slightly playful** — medieval setting allows for humor ("The King was not amused that his morning was spent reading invoices")
- **Technically grounded** — behind the metaphor, the numbers are real (40-200x speed, 100x cost reduction)
- **Action-oriented** — ends with "here's how to build your Sorting Scribe"
