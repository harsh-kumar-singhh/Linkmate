// ============================================================
// LinkMate — Default Style Memory v2.0
// Upgraded reference library for AI-powered LinkedIn writing
// ============================================================
// Architecture notes:
//   - Each post now carries qualityScore, patterns[], and viralMechanism
//   - hookType is one of: contrarian | story | stat | question | list | observation | paradox
//   - Retrieval uses multi-signal scoring: category, tags, topic clusters, hook diversity
//   - Minimum quality score for inclusion: 6.5 / 10
//   - Recommended score: 7.5+  |  Elite: 9+
// ============================================================

export interface ReferencePost {
    id: string;
    category: PostCategory;
    tags: string[];
    content: string;
    // v2 additions
    hookType: HookType;
    patterns: WritingPattern[];
    qualityScore: number;         // 1–10 composite score
    viralMechanism?: string;      // what makes it spread (optional context)
    topicCluster: TopicCluster;
}

export type PostCategory =
    | "startup"
    | "career"
    | "productivity"
    | "technology"
    | "mindset"
    | "relationships"
    | "personal-growth"
    | "storytelling"
    | "linkedin-growth"
    | "saas"
    | "ai"
    | "founder"
    | "leadership"
    | "sales"
    | "finance";

export type HookType =
    | "contrarian"       // challenges received wisdom directly
    | "story"            // opens in the middle of a scene or event
    | "stat"             // leads with a specific, surprising number
    | "observation"      // a quiet, precise notice of how something works
    | "paradox"          // two things that seem to contradict, held together
    | "list-subversion"  // looks like a list, breaks the expected pattern
    | "direct-challenge" // calls someone out to their face
    | "confession"       // admits a specific mistake or belief
    | "pattern-reveal";  // names a pattern most people haven't articulated

export type WritingPattern =
    | "single-line-punch"    // one-line paragraphs used as emphasis weapons
    | "rule-of-three"        // three parallel items, third subverts expectation
    | "before-after"         // describes the before state, then the after
    | "failure-lesson"       // specific failure → specific lesson extracted
    | "dialogue-reveal"      // uses a real or implied quote to pivot the post
    | "zoom-out"             // starts specific, ends with the wider principle
    | "zoom-in"              // starts with a big idea, ends with a specific scene
    | "list-as-argument"     // each list item advances a single argument
    | "reversal"             // ends by flipping the opening claim
    | "soft-landing"         // ends quietly, not with a command
    | "hard-cta"             // ends with a direct action instruction
    | "rhetorical-question"  // poses a question the reader can't comfortably answer
    | "tension-then-release" // builds discomfort, then resolves it
    | "naming-the-feeling"   // gives a name to something the reader has felt
    | "micro-story";         // complete narrative arc in under 150 words

export type TopicCluster =
    | "building"      // product, engineering, technical decisions
    | "operating"     // management, leadership, systems, process
    | "growing"       // marketing, distribution, linkedin, audience
    | "learning"      // mental models, habits, self-improvement
    | "navigating"    // career decisions, job market, negotiations
    | "shipping"      // sales, closing, customer success
    | "surviving";    // burnout, failure, hard lessons

export interface StyleMemory {
    writingPrinciples: string[];
    bannedPhrases: string[];
    bannedStructures: string[];    // v2: structural anti-patterns
    hookStructures: HookTemplate[];
    formattingPatterns: string[];
    endingPatterns: string[];      // v2: how to close posts
    qualityFramework: QualityFramework;
    referencePosts: ReferencePost[];
}

export interface HookTemplate {
    type: HookType;
    description: string;
    template: string;
    example: string;
}

export interface QualityFramework {
    dimensions: QualityDimension[];
    minimumScore: number;
    recommendedScore: number;
    eliteScore: number;
}

export interface QualityDimension {
    name: string;
    weight: number;       // how much it contributes to composite score (0–1, sum = 1)
    description: string;
}

// ============================================================
// QUALITY FRAMEWORK
// ============================================================
export const QUALITY_FRAMEWORK: QualityFramework = {
    dimensions: [
        {
            name: "Hook Strength",
            weight: 0.25,
            description: "Does the first line demand the reader stop scrolling? Score low if it starts with 'I', a generic observation, or a vague question."
        },
        {
            name: "Specificity",
            weight: 0.20,
            description: "Are the details concrete? Numbers, names, dollar amounts, timelines, and named decisions score higher than 'many', 'often', 'some people'."
        },
        {
            name: "Memorability",
            weight: 0.15,
            description: "Would a reader quote this in a conversation? Does it produce a single, repeatable idea?"
        },
        {
            name: "Authority",
            weight: 0.15,
            description: "Does the writer seem to have genuinely lived this? Earned insight scores higher than borrowed wisdom."
        },
        {
            name: "Storytelling",
            weight: 0.10,
            description: "Is there narrative tension? Even a 4-sentence post can have a problem, a turn, and a resolution."
        },
        {
            name: "Emotional Resonance",
            weight: 0.10,
            description: "Does it make the reader feel seen, challenged, or surprised? Neutral observations score low here."
        },
        {
            name: "LinkedIn Fit",
            weight: 0.05,
            description: "Does it match the format, register, and scroll behavior of the platform? Long academic paragraphs score low."
        }
    ],
    minimumScore: 6.5,
    recommendedScore: 7.5,
    eliteScore: 9.0
};

// ============================================================
// DEFAULT STYLE MEMORY
// ============================================================
export const DEFAULT_STYLE_MEMORY: StyleMemory = {

    writingPrinciples: [
        "Write the first line for the person who is not going to read the post. It has to earn their scroll.",
        "Use the smallest true number, not the largest impressive one. '3 months' beats 'Q3'.",
        "Name the mistake before you name the lesson. Nobody trusts advice from someone who has never failed.",
        "End differently than you start. A post that ends where it began taught the reader nothing.",
        "Pick one enemy per post. Not three. Not a category. One specific idea, belief, or behavior to argue against.",
        "Avoid the wisdom that sounds like a bumper sticker. If it can fit on a motivational poster, cut it.",
        "Put the insight in the body, not the conclusion. The ending should land, not explain.",
        "Concrete details are your credibility. A $14,000 refund is more believable than 'a large refund'.",
        "Write like you are texting a smart friend, not presenting to a board.",
        "One post, one idea. Not 'five lessons I learned' unless each lesson earns its place independently.",
        "The reader is asking 'so what?' after every sentence. Answer before they ask.",
        "If you can remove the first paragraph and the post is better, remove it."
    ],

    bannedPhrases: [
        // Original bans (kept)
        "Consistency is key",
        "In today's fast-paced world",
        "The future belongs to",
        "Success is not about",
        "Let that sink in",
        "Read that again",
        "At the end of the day",
        "It goes without saying",
        "A game changer",
        "Take it to the next level",
        "Level up your",
        "In a world where",
        // v2 additions
        "I am so honored",
        "I am beyond grateful",
        "Humbled and honored",
        "Incredibly excited to announce",
        "Excited to share",
        "Never stop learning",
        "The secret to",
        "Here is what nobody tells you",   // overused; only use if genuinely novel
        "Stop doing X. Start doing Y",     // pattern is fine; the phrase is tired
        "This is your sign to",
        "Not everyone will understand your vision",
        "Your vibe attracts your tribe",
        "Work smarter, not harder",
        "You miss 100% of the shots you don't take",
        "Do the work",
        "Embrace the journey",
        "Be the change",
        "Think outside the box",
        "Pivot",                            // as a standalone lesson
        "Bandwidth",                        // in any non-technical context
        "Circle back",
        "Move the needle",
        "Low-hanging fruit",
        "Deep dive",
        "Unpack",
        "Learnings"                         // use "lessons" or describe them directly
    ],

    bannedStructures: [
        "Opening with 'I am [job title] at [company] and today I want to share...'",
        "Numbered list of 5-10 generic tips with no unifying argument",
        "One-word sentences used purely for drama without payoff ('Stop.' 'Really.' 'Think.')",
        "Ending with 'Drop a comment below' or 'What do you think?'",
        "The triple 'agree?' closing technique",
        "Starting with a question that has an obvious yes/no answer",
        "Three consecutive 'I' sentences at the open",
        "Posting a screenshot of a tweet with no original thought added",
        "The 'hot take:' label (if it were actually hot, you wouldn't need the label)",
        "Unsolicited advice dressed as personal story ('I used to do X. Now I do Y. You should too.')"
    ],

    hookStructures: [
        {
            type: "contrarian",
            description: "Directly contradicts a widely held belief in the first sentence. No hedging.",
            template: "[Common belief] is wrong. Here is what actually happens.",
            example: "Most founders don't need more funding. They need fewer features."
        },
        {
            type: "confession",
            description: "Opens with a specific, credibility-building mistake the writer made.",
            template: "I [specific wrong action] for [time period]. It cost me [specific consequence].",
            example: "I hired three developers before writing a single line of product spec. We shipped nothing for four months."
        },
        {
            type: "stat",
            description: "A precise number that creates immediate cognitive friction.",
            template: "[Specific number] [surprising fact]. [One-sentence implication].",
            example: "83% of our churned users never reached the second screen of onboarding. We had spent six months perfecting screen seven."
        },
        {
            type: "observation",
            description: "Names a pattern the reader has felt but never articulated.",
            template: "The [role/person] who [unexpected behavior] almost always [surprising outcome].",
            example: "The engineers who write the worst code almost always have the cleanest commit messages."
        },
        {
            type: "paradox",
            description: "Two things that seem to conflict, held in the same sentence.",
            template: "[Positive thing] is often how [negative thing] begins.",
            example: "Shipping fast is often how technical debt becomes unmanageable. The best teams know when to slow down to go faster."
        },
        {
            type: "story",
            description: "Opens mid-scene. The reader is dropped into a moment.",
            template: "[Scene-setting action]. [Immediate complication].",
            example: "We were three slides into the investor pitch when she raised her hand. 'Who is your customer?' We didn't have a clean answer."
        },
        {
            type: "direct-challenge",
            description: "Calls out a behavior directly, with the reader as the implied subject.",
            template: "If you [common behavior], you are [honest consequence]. Nobody will say it, so I will.",
            example: "If your deck is 40 slides, you haven't thought clearly about your business. You've just avoided the hard decisions."
        },
        {
            type: "pattern-reveal",
            description: "Names a non-obvious pattern across multiple observations.",
            template: "Every [type of person/company] that [does X] eventually [discovers Y]. There are no exceptions.",
            example: "Every B2B company that skips sales and goes straight to self-serve eventually builds a sales team. The market decides, not you."
        }
    ],

    formattingPatterns: [
        "Open with one sentence alone. Let it breathe.",
        "Group ideas into 2–3 sentence blocks separated by white space, not punctuation.",
        "Use single-sentence paragraphs sparingly — only for the one idea that must land alone.",
        "Never put more than 4 sentences in a single block.",
        "If using a list, each item should be a complete, independent claim, not a fragment.",
        "The post's visual shape should feel like breathing: short → medium → short, or medium → short → medium.",
        "Avoid using em-dashes to cram two thoughts into one sentence when two sentences would be cleaner.",
        "No bullet points that start with the same word more than twice.",
        "Don't bold phrases in the middle of a paragraph. Bold is for standalone labels only.",
        "Keep total post length under 250 words unless the story earns every word."
    ],

    endingPatterns: [
        "The reversal: end with the opposite of where you started, now earned by what came between.",
        "The quiet landing: state the principle simply, without a call-to-action, and trust the reader.",
        "The implication: don't state the conclusion — describe what it means if you are right.",
        "The open question: ask something the reader cannot easily answer, without asking them to comment.",
        "The instruction: one specific, actionable sentence. Not 'do better'. Do exactly [X] tomorrow morning.",
        "Never end with 'Thanks for reading' or 'I hope this helps.' End with the idea, not the courtesy."
    ],

    qualityFramework: QUALITY_FRAMEWORK,

    // ============================================================
    // REFERENCE POST LIBRARY v2 (40 posts)
    // ============================================================
    referencePosts: [

        // ─────────────────────────────────────────────────────────
        // FOUNDER / STARTUP
        // ─────────────────────────────────────────────────────────
        {
            id: "founder-01",
            category: "founder",
            topicCluster: "building",
            tags: ["founder", "product", "users", "listening"],
            hookType: "confession",
            patterns: ["failure-lesson", "zoom-out", "soft-landing"],
            qualityScore: 9.0,
            viralMechanism: "Founders recognize themselves in the mistake. The reversal is satisfying.",
            content: `I spent 11 weeks building a feature nobody asked for.

Not because I didn't talk to users. I did. Every Friday, religiously.

But I listened for validation, not information. I asked "does this sound useful?" and they said yes, because of course they said yes. Nobody tells a founder their baby is ugly.

The question I should have been asking: "What did you do when this problem came up last week?"

Behavior. Not opinion. Not hypothetical. What did you actually do.

The answer would have told me they had already built a workaround. A spreadsheet. A Slack channel. An entire informal system that made my feature unnecessary before I wrote a line of code.

Ask what people do. Not what they want.`
        },

        {
            id: "founder-02",
            category: "founder",
            topicCluster: "building",
            tags: ["founder", "mvp", "launch", "scope"],
            hookType: "contrarian",
            patterns: ["single-line-punch", "reversal", "hard-cta"],
            qualityScore: 8.0,
            content: `Your MVP is not minimal enough.

I have reviewed over 200 early-stage products in the last three years. The pattern is almost embarrassing in its consistency.

Founders call something an MVP when it has six features, two pricing tiers, onboarding documentation, and a referral program.

That is not a minimum viable product. That is a product you are afraid to cut.

A real MVP answers one question: will a stranger pay for this specific thing?

One thing. Not five. Not "core functionality." One.

Find the smallest thing someone would hand you money for. Build that. The rest is a guess dressed as a roadmap.`
        },

        {
            id: "founder-03",
            category: "startup",
            topicCluster: "operating",
            tags: ["hiring", "early-stage", "team", "founder"],
            hookType: "observation",
            patterns: ["zoom-in", "tension-then-release", "soft-landing"],
            qualityScore: 8.5,
            content: `The first ten hires at a startup are not employees. They are a bet on what kind of company you are becoming.

You can hire for skills. Fast.

Or you can hire for judgment. Slow.

Skill hires fix today's problem. Judgment hires prevent next year's crisis.

Most early founders hire for skills because today's problem is on fire and next year feels abstract.

By the time the crisis arrives, the team culture is already set. The people with skills but no judgment have already shaped what "normal" looks like at your company.

Hire slow. Fire fast. But mostly: be honest about what you are actually optimizing for when you bring someone on.`
        },

        {
            id: "founder-04",
            category: "startup",
            topicCluster: "surviving",
            tags: ["fundraising", "founder", "rejection", "investors"],
            hookType: "confession",
            patterns: ["micro-story", "before-after", "naming-the-feeling"],
            qualityScore: 8.5,
            content: `We got 47 no's before we got our first yes.

I have a spreadsheet. I kept it because I wanted to remember what it felt like. The column headers are: Firm, Partner, Reason Given, Real Reason, Follow-up.

The "reason given" column is almost useless. "Not the right time." "Outside our thesis." "Team too early."

The "real reason" column is where I started learning. Translated: we don't believe this market exists. We don't believe you can execute. We have already backed someone doing this.

The 48th meeting was different because we had stopped trying to convince people the market existed and started showing them it already did. Real customers. Real revenue. Small but real.

Nobody funds a belief. They fund evidence dressed as belief.`
        },

        {
            id: "startup-refined-01",
            category: "startup",
            topicCluster: "building",
            tags: ["onboarding", "churn", "product", "activation"],
            hookType: "stat",
            patterns: ["zoom-in", "failure-lesson", "hard-cta"],
            qualityScore: 8.5,
            content: `Most founders think they need more features to close deals.

They don't.

I spent 3 months building an analytics dashboard nobody asked for. When I finally talked to churned users, they didn't leave because the product lacked features. They left because the onboarding was too confusing to get to the core value.

Stop building. Start simplifying.`
        },

        {
            id: "founder-05",
            category: "founder",
            topicCluster: "shipping",
            tags: ["pricing", "saas", "revenue", "founder"],
            hookType: "contrarian",
            patterns: ["rule-of-three", "zoom-out", "soft-landing"],
            qualityScore: 8.0,
            content: `You are undercharging. Not a little. A lot.

The price you picked was not based on value. It was based on fear. Fear that if you charged more, nobody would buy. Fear that you would be exposed as not worth it.

I have watched founders charge $29/month for software that saves a customer $3,000 a month. When I ask why, the answer is always some version of "I didn't want to seem expensive."

Your customer is not comparing you to nothing. They are comparing you to the status quo. If the status quo costs them three hours a week and your product gives those hours back, you are worth real money.

Raise your prices. Lose the customers who only wanted cheap. Keep the ones who understand value.`
        },

        // ─────────────────────────────────────────────────────────
        // TECHNOLOGY / AI / ENGINEERING
        // ─────────────────────────────────────────────────────────
        {
            id: "tech-refined-01",
            category: "technology",
            topicCluster: "building",
            tags: ["legacy-code", "engineering", "rewrites", "software"],
            hookType: "contrarian",
            patterns: ["zoom-out", "failure-lesson", "hard-cta"],
            qualityScore: 8.0,
            content: `We rewrite systems because we don't understand them, not because they are broken.

It's a harsh truth for engineering teams. You inherit a legacy codebase. It looks messy. You convince management it needs a complete rewrite. Two years later, the new system has the exact same bugs as the old one, plus new ones.

Before you propose a rewrite, try writing documentation for the existing system. If you can't explain it, you definitely can't replace it.`
        },

        {
            id: "ai-01",
            category: "ai",
            topicCluster: "building",
            tags: ["ai", "llm", "product", "engineering", "prompting"],
            hookType: "observation",
            patterns: ["zoom-in", "naming-the-feeling", "soft-landing"],
            qualityScore: 8.5,
            content: `Most AI products fail in the last 10%.

The model works. The demo works. The investor deck works.

What doesn't work is the edge case at 11pm when a real customer with a real problem gets a confident, wrong answer.

This is the part of AI product development nobody talks about: not the capability, but the failure mode. What does your product do when the model is wrong? Does it fail loudly or quietly? Does the user know? Do you?

The companies that will win are not building the most capable AI. They are building the most honest AI. Systems that know what they don't know.

That is much harder. And almost nobody is doing it.`
        },

        {
            id: "ai-02",
            category: "ai",
            topicCluster: "learning",
            tags: ["ai", "automation", "jobs", "skills", "future"],
            hookType: "paradox",
            patterns: ["rule-of-three", "zoom-out", "soft-landing"],
            qualityScore: 8.0,
            content: `The people most afraid of AI taking their jobs are the ones who should be most afraid.

Not because AI is more capable than them. Because they have never clearly defined what they actually do.

"I manage relationships." Doing what, exactly?
"I handle communications." Which decisions do you make?
"I oversee the process." Where does your judgment show up?

If you cannot answer those questions in concrete terms, you do not have a job. You have a set of activities. Activities can be automated. Judgment, for now, cannot.

The question AI is forcing everyone to answer is not "can a machine do this?" It is "can I explain what I actually do?"

Most people cannot. That is the real problem.`
        },

        {
            id: "tech-03",
            category: "technology",
            topicCluster: "building",
            tags: ["engineering", "meetings", "culture", "process"],
            hookType: "observation",
            patterns: ["single-line-punch", "zoom-out", "reversal"],
            qualityScore: 7.5,
            content: `The number of meetings at a company is inversely proportional to the clarity of its decisions.

Not because meetings cause confusion. Because confusion causes meetings.

When a team knows exactly what they are building, who owns what, and what success looks like, most meetings become optional. They happen anyway out of habit, but everyone knows they could have been a message.

When nobody is sure, meetings multiply. Every ambiguity spawns a sync. Every sync creates an action item. Every action item spawns another sync to check if the action item is done.

Unclear strategy is expensive. It does not show up on a budget line. It shows up in your calendar.`
        },

        // ─────────────────────────────────────────────────────────
        // CAREER
        // ─────────────────────────────────────────────────────────
        {
            id: "career-refined-01",
            category: "career",
            topicCluster: "navigating",
            tags: ["career", "friction", "value", "leadership"],
            hookType: "observation",
            patterns: ["zoom-in", "naming-the-feeling", "soft-landing"],
            qualityScore: 8.0,
            content: `The best career advice I ever received wasn't about networking or negotiating.

It was: 'Be the person who removes friction.'

When a project stalls, the person who steps in to unblock the team becomes indispensable. It's not about working the most hours. It's about solving the bottleneck no one else wants to touch.`
        },

        {
            id: "career-03",
            category: "career",
            topicCluster: "navigating",
            tags: ["career", "promotions", "visibility", "work"],
            hookType: "contrarian",
            patterns: ["failure-lesson", "zoom-out", "hard-cta"],
            qualityScore: 8.5,
            content: `Good work does not get promoted. Visible work gets promoted.

This is not cynicism. This is how organizations actually function.

Your manager does not experience your work directly. They experience reports of your work, filtered through whoever is in the room when your name comes up. If your name does not come up, it does not matter how good the work is.

I spent four years being the best engineer on the team by almost any technical measure. I got one promotion. A colleague who was objectively less technically capable got two. The difference was not performance. It was that he talked about what he was working on. In meetings. In Slack. In the five-minute chats before standups.

Document your wins. Share them before someone asks. Your manager is not ignoring you. They are just busy and distracted and have fifteen other things to worry about. Help them remember you exist.`
        },

        {
            id: "career-04",
            category: "career",
            topicCluster: "navigating",
            tags: ["negotiation", "salary", "career", "offers"],
            hookType: "confession",
            patterns: ["micro-story", "dialogue-reveal", "hard-cta"],
            qualityScore: 9.0,
            content: `I left $40,000 on the table in my first job negotiation.

I got the offer. $95,000. I said "that sounds great, thank you."

Three months later I found out a colleague hired the same week, with less experience, had negotiated to $117,000.

When I asked her how, she said: "I just said the number I wanted and waited."

That was it. She asked. I didn't. $22,000 a year, plus compound raises on top of a higher base, for the same work, at the same desk.

The company did not volunteer the difference. They gave her what she asked for and gave me what I accepted.

Never accept the first number. Always wait after you state yours. The silence is uncomfortable for both sides. Their discomfort is less expensive than yours.`
        },

        {
            id: "career-refined-02",
            category: "career",
            topicCluster: "navigating",
            tags: ["hiring", "enthusiasm", "interviews", "skills"],
            hookType: "story",
            patterns: ["micro-story", "zoom-out", "soft-landing"],
            qualityScore: 8.5,
            content: `Your resume gets you the interview. Your enthusiasm gets you the job.

I interviewed a candidate last week who lacked 30% of the required technical skills.

But she had spent the weekend building a small prototype using our company's public API.

I hired her immediately over someone with 5 more years of experience who couldn't even explain what our company did.

Skills can be taught in a month. Giving a shit cannot be taught.`
        },

        // ─────────────────────────────────────────────────────────
        // PRODUCTIVITY
        // ─────────────────────────────────────────────────────────
        {
            id: "productivity-refined-01",
            category: "productivity",
            topicCluster: "learning",
            tags: ["time-blocking", "scheduling", "focus", "systems"],
            hookType: "contrarian",
            patterns: ["before-after", "failure-lesson", "soft-landing"],
            qualityScore: 8.5,
            content: `Time-blocking works, but only if you block time for the mess.

For years, I scheduled every hour of my day perfectly. And every day, I felt like a failure by 2 PM because a random fire drill ruined the schedule.

The fix? I now block 90 minutes a day specifically for 'chaos'. When things go wrong, it eats into the chaos block, not my deep work.`
        },

        {
            id: "productivity-03",
            category: "productivity",
            topicCluster: "learning",
            tags: ["email", "communication", "work", "async"],
            hookType: "observation",
            patterns: ["zoom-in", "tension-then-release", "hard-cta"],
            qualityScore: 7.5,
            content: `Most emails are long because the sender did not have time to make them short.

Writing a clear, brief email takes longer than writing a rambling one. You have to think. You have to cut. You have to know what you actually want.

Most people skip that step and send the first draft.

The result is a 300-word email that requires a reply asking for clarification, which triggers another 300-word email, which requires another reply.

A five-minute investment in clarity saves twenty minutes of back-and-forth.

Before sending, read it back and cut anything that doesn't need a response.`
        },

        {
            id: "productivity-04",
            category: "productivity",
            topicCluster: "learning",
            tags: ["focus", "deep-work", "output", "habits"],
            hookType: "contrarian",
            patterns: ["single-line-punch", "naming-the-feeling", "soft-landing"],
            qualityScore: 8.0,
            content: `You do not have a productivity problem. You have a priority problem.

Everything on your to-do list is there because you said yes to it. Most of it should not be there. You said yes because it felt easier than saying no, or because you genuinely believed you would have time, or because someone made a request at a moment when you couldn't think clearly.

The real work of productivity is not finding time. It is being honest about what the time you have can actually hold. That list of 23 tasks? Twelve of them will not get done this week. Pick the three that matter most and ignore the rest.

Ignoring is a skill. Saying no is a skill. Protecting the six hours a week where you do your best work is a skill.

None of those skills fit in an app.`
        },

        {
            id: "productivity-refined-02",
            category: "productivity",
            topicCluster: "learning",
            tags: ["tools", "systems", "apps", "focus"],
            hookType: "contrarian",
            patterns: ["failure-lesson", "reversal", "zoom-out"],
            qualityScore: 8.0,
            content: `The biggest productivity lie is that you need a better app.

You don't need Notion, Obsidian, or a perfectly tagged database.

You need to turn off your notifications and close 40 of your browser tabs.

I spent an entire weekend setting up a 'second brain' system. I spent zero hours actually doing the work I built the system for.

Simple systems executed consistently > complex systems abandoned after a week.`
        },

        // ─────────────────────────────────────────────────────────
        // PERSONAL GROWTH / MINDSET
        // ─────────────────────────────────────────────────────────
        {
            id: "personal-growth-refined-01",
            category: "personal-growth",
            topicCluster: "learning",
            tags: ["imposter-syndrome", "growth", "psychology", "discomfort"],
            hookType: "direct-challenge",
            patterns: ["naming-the-feeling", "reversal", "soft-landing"],
            qualityScore: 8.5,
            content: `You don't have imposter syndrome. You are just doing something for the first time.

Stop diagnosing yourself with a psychological condition every time you feel slightly uncomfortable.

When you start a new job, of course you don't know what you're doing. When you launch a new product, of course you feel unqualified.

That isn't imposter syndrome. That's just the baseline feeling of learning.

Embrace the incompetence. It means you're actually growing.`
        },

        {
            id: "mindset-02",
            category: "mindset",
            topicCluster: "learning",
            tags: ["feedback", "criticism", "growth", "ego"],
            hookType: "observation",
            patterns: ["tension-then-release", "zoom-out", "soft-landing"],
            qualityScore: 8.0,
            content: `The people who are easiest to give feedback to are usually the most successful.

Not because they are never wrong. Because they are not defending their self-image every time someone points something out.

They hear "this part doesn't work" as information, not as judgment. They fix it and move on. The conversation is five minutes.

The people who are hardest to give feedback to consume enormous amounts of organizational energy. Every note becomes a negotiation. Every critique requires processing time and reassurance.

If you want to know how you are perceived at work, ask yourself: when your manager has a correction, do they look forward to that conversation or dread it?

Their answer tells you everything about how much they invest in your growth.`
        },

        {
            id: "mindset-03",
            category: "mindset",
            topicCluster: "surviving",
            tags: ["failure", "resilience", "growth", "founder"],
            hookType: "story",
            patterns: ["micro-story", "naming-the-feeling", "reversal"],
            qualityScore: 8.5,
            content: `My first company failed.

Not slowly, with dignity. Quickly, with $160,000 of other people's money spent on a product we could not get a single stranger to pay for.

The worst part was not the failure. It was explaining it to the investors. They were kind. That somehow made it worse.

I spent six months convinced the failure had defined me. That every future conversation would start with "so you're the guy who—".

It didn't. Nobody remembered. Not because they forgave me — because they had moved on to worrying about their own problems the moment I left the room.

The story you are telling yourself about your failure is almost certainly louder and longer than any story anyone else is telling.

Start the next thing.`
        },

        {
            id: "personal-growth-02",
            category: "personal-growth",
            topicCluster: "learning",
            tags: ["advice", "mentors", "learning", "experience"],
            hookType: "contrarian",
            patterns: ["zoom-out", "rhetorical-question", "soft-landing"],
            qualityScore: 7.5,
            content: `Most advice is autobiographical.

When a successful person tells you what to do, they are not telling you the formula for success. They are telling you what happened to work for them, in their context, with their resources, at that particular moment in history.

The advice that "you need to be in the room" was true when the room mattered. In some industries it still does. In others the room has moved online and the advice is two decades stale.

Take advice seriously but hold it loosely. Ask: does this person's situation resemble mine? Is this principle, or is this nostalgia?

Almost every rigid rule has a successful exception somewhere. The useful question is not "what worked?" but "why did it work?" That second question is the one almost nobody asks.`
        },

        // ─────────────────────────────────────────────────────────
        // LEADERSHIP / OPERATING
        // ─────────────────────────────────────────────────────────
        {
            id: "leadership-01",
            category: "leadership",
            topicCluster: "operating",
            tags: ["leadership", "management", "communication", "clarity"],
            hookType: "observation",
            patterns: ["zoom-in", "tension-then-release", "soft-landing"],
            qualityScore: 8.5,
            content: `The most expensive phrase in any company is "I thought you meant—".

Not because of the mistake itself. Because of everything that had to go wrong for that sentence to become necessary.

Someone assumed. Nobody confirmed. Two weeks of work went in a direction that made sense in isolation and was completely wrong in context.

The fix is not more documentation. It is a single closing ritual after every significant decision: "Let me say back what we just agreed to, and who is doing what by when."

It takes ninety seconds. It prevents the "I thought you meant" conversation from happening a month later when the stakes are high and the deadline has passed.

Clarity is not a soft skill. It is your most undervalued cost center.`
        },

        {
            id: "leadership-02",
            category: "leadership",
            topicCluster: "operating",
            tags: ["management", "hiring", "performance", "leadership"],
            hookType: "contrarian",
            patterns: ["zoom-out", "rule-of-three", "soft-landing"],
            qualityScore: 8.0,
            content: `Most managers hire people to do what they say.

Great managers hire people who push back on what they say.

There is a specific moment in every hiring process where you can tell the difference. It is when the candidate disagrees with something you have just said. The weak manager feels threatened and moves on. The strong manager leans in and asks why.

A team that only tells you what you want to hear has one decision-maker and everyone else is a keyboard.

A team that argues with you — respectfully, with evidence — is a team where mistakes get caught before they are shipped.

Hire people who make you defend your thinking. They will make you better and protect you from yourself.`
        },

        // ─────────────────────────────────────────────────────────
        // SALES / STORYTELLING / COMMUNICATION
        // ─────────────────────────────────────────────────────────
        {
            id: "storytelling-refined-01",
            category: "storytelling",
            topicCluster: "shipping",
            tags: ["sales", "closing", "timing", "communication"],
            hookType: "story",
            patterns: ["micro-story", "zoom-out", "hard-cta"],
            qualityScore: 9.0,
            content: `I once lost a $50k deal because I talked for 3 minutes too long.

The client said 'Yes, we are ready to move forward.'

Instead of sending the contract, I decided to show them one more slide about our API integration.

That slide confused the technical lead. He asked a question I couldn't answer. They said they needed a week to review it. They ghosted us.

When the client says yes, stop selling. Shut your laptop. Send the contract.`
        },

        {
            id: "sales-01",
            category: "sales",
            topicCluster: "shipping",
            tags: ["sales", "objections", "trust", "b2b"],
            hookType: "observation",
            patterns: ["zoom-in", "tension-then-release", "soft-landing"],
            qualityScore: 8.5,
            content: `Most sales objections are not about the product. They are about the risk of being wrong.

"Too expensive" usually means: I can't justify this to my boss if it fails.
"We need to think about it" usually means: I am not sure enough to own this decision.
"Let's revisit next quarter" usually means: the cost of being right isn't worth the cost of being wrong.

You cannot answer a risk objection with a product feature. You answer it by reducing the risk.

Case studies from similar companies. A short pilot with a defined exit. A guarantee with real teeth. References they can actually call.

When someone is stalling, they are not stalling on price. They are stalling on trust. Sell the trust.`
        },

        {
            id: "storytelling-02",
            category: "storytelling",
            topicCluster: "growing",
            tags: ["writing", "communication", "content", "clarity"],
            hookType: "contrarian",
            patterns: ["zoom-out", "single-line-punch", "soft-landing"],
            qualityScore: 8.0,
            content: `Nobody reads long posts because they are long.

They read long posts because every sentence earns the next one.

The length is not the problem and it is not the solution. The problem is sentences that exist because the writer hadn't finished thinking when they started writing.

Before you post anything longer than 150 words, ask yourself: if I cut the first paragraph, does the post get better? If you cut the last paragraph, does it lose anything important?

Most posts improve when you cut both.

The most powerful writing leaves the reader with one clear, specific thing to carry away. Not five. Not three. One.

Say the one thing better.`
        },

        // ─────────────────────────────────────────────────────────
        // LINKEDIN GROWTH / CONTENT
        // ─────────────────────────────────────────────────────────
        {
            id: "linkedin-01",
            category: "linkedin-growth",
            topicCluster: "growing",
            tags: ["linkedin", "content", "audience", "writing"],
            hookType: "contrarian",
            patterns: ["zoom-out", "reversal", "soft-landing"],
            qualityScore: 8.5,
            content: `You do not need to post every day to grow on LinkedIn.

You need to say something worth reading when you do.

Daily posting without a point of view produces a steady drip of content nobody remembers. It trains your audience to scroll past you.

One post a week that challenges an assumption, tells a real story, or shares a non-obvious observation will do more for your reputation than 365 posts that begin "I am thrilled to share."

Volume is not a content strategy. It is content avoidance. Posting every day so you never have to ask whether what you are posting is actually good.

Ask that question before you post. Not after.`
        },

        {
            id: "linkedin-02",
            category: "linkedin-growth",
            topicCluster: "growing",
            tags: ["personal-brand", "linkedin", "niche", "audience"],
            hookType: "observation",
            patterns: ["zoom-in", "naming-the-feeling", "soft-landing"],
            qualityScore: 8.0,
            content: `The fastest way to grow an audience is to stop trying to appeal to everyone.

The creator who posts about "business, life, mindset, and growth" has four audiences of zero.

The creator who posts about "what I am learning running a bootstrapped B2B SaaS in a market with one dominant player" has a small, specific, loyal audience who sends the posts to exactly the right people.

Niche does not mean small. It means specific. Specific is the only thing the algorithm and the human brain both reward.

Name the exact person you are writing for. If you cannot name them, you are writing for yourself and hoping someone relates. That is not an audience strategy. It is a journal.`
        },

        {
            id: "linkedin-03",
            category: "linkedin-growth",
            topicCluster: "growing",
            tags: ["comments", "engagement", "linkedin", "community"],
            hookType: "observation",
            patterns: ["zoom-in", "hard-cta", "soft-landing"],
            qualityScore: 7.5,
            content: `The best LinkedIn growth hack is leaving better comments.

Not "great post!" Not a paragraph that starts with "I agree, and—" and then repeats what the original post said.

A comment that adds a specific disagreement, a concrete example from your own experience, or a question that nobody else thought to ask.

That comment gets seen by everyone who reads the original post. It gets you profile visits from people who would never have found you otherwise. It starts conversations.

Most creators spend 80% of their time on posts and 0% on comments. Flip the ratio for two weeks. Track what happens.

The comment section is the most underused growth channel on the platform.`
        },

        // ─────────────────────────────────────────────────────────
        // SaaS / PRODUCT
        // ─────────────────────────────────────────────────────────
        {
            id: "saas-01",
            category: "saas",
            topicCluster: "building",
            tags: ["saas", "churn", "retention", "product"],
            hookType: "contrarian",
            patterns: ["zoom-in", "failure-lesson", "soft-landing"],
            qualityScore: 8.5,
            content: `Most SaaS companies treat churn as a product problem.

It is almost always a success definition problem.

Your customer signed up to achieve something. If they churn, one of two things happened: they achieved it and no longer need you, or they gave up trying.

Neither of those is solved by adding a feature.

The first requires you to expand the definition of what "done" looks like for them. The second requires you to understand where they stopped making progress and why.

We spent six months rebuilding our churn dashboard before someone asked the obvious question: what did customers who stayed for three years do differently in their first thirty days?

The answer was specific, replicable, and had nothing to do with our dashboard.`
        },

        {
            id: "saas-02",
            category: "saas",
            topicCluster: "building",
            tags: ["pricing", "saas", "annual-plans", "revenue"],
            hookType: "stat",
            patterns: ["zoom-in", "tension-then-release", "hard-cta"],
            qualityScore: 8.0,
            content: `Moving 20% of customers to annual plans cut our monthly revenue volatility in half.

We did not add a feature. We did not change the product. We changed one sentence on the pricing page and added a 15% discount for annual commitment.

The customers who switched to annual were already our best customers. Lower churn risk. Higher NPS. More likely to refer. We were just giving them a reason to signal the commitment they had already made.

The customers who stayed on monthly were also telling us something. Some of them had no intention of being long-term customers. Knowing that earlier saved us from over-investing in retention for the wrong segment.

Annual plans are not just a revenue move. They are a customer quality signal.`
        },

        // ─────────────────────────────────────────────────────────
        // FINANCE / BUSINESS
        // ─────────────────────────────────────────────────────────
        {
            id: "finance-01",
            category: "finance",
            topicCluster: "operating",
            tags: ["cashflow", "startup", "finance", "founder"],
            hookType: "contrarian",
            patterns: ["zoom-in", "failure-lesson", "soft-landing"],
            qualityScore: 8.0,
            content: `Profitable companies go bankrupt. Unprofitable ones survive.

This sounds wrong until you understand cash flow.

Profitability is an accounting concept. Cash is a survival concept. You can be profitable on paper and run out of cash to make payroll on Friday.

I watched a SaaS company hit $2M ARR, achieve positive EBITDA for the first time, and then almost fold because they had offered 90-day payment terms to their three largest enterprise customers.

Revenue was real. Cash was not there yet. They needed a bridge loan to survive the quarter they were most profitable on record.

Know your cash conversion cycle before you celebrate your P&L.`
        },

        // ─────────────────────────────────────────────────────────
        // RELATIONSHIPS
        // ─────────────────────────────────────────────────────────
        {
            id: "relationships-02",
            category: "relationships",
            topicCluster: "navigating",
            tags: ["mentorship", "relationships", "career", "learning"],
            hookType: "contrarian",
            patterns: ["zoom-out", "reversal", "soft-landing"],
            qualityScore: 8.0,
            content: `Stop looking for a mentor. Start being useful to someone who has what you want.

Most people approach mentorship backwards. They identify someone successful and ask for their time and wisdom before establishing any reason to be worth that investment.

A better approach: find someone whose work you admire, learn their problem space deeply, and then show up with something useful. A relevant article they haven't seen. A connection that serves their interest. A solution to a problem they have mentioned publicly.

You are not networking. You are demonstrating judgment, which is the one thing that cannot be faked in a cold email.

The mentor relationship forms naturally after that. They were not waiting for someone to ask for their time. They were waiting for someone who understood their world.`
        },

        {
            id: "relationships-refined-01",
            category: "relationships",
            topicCluster: "navigating",
            tags: ["networking", "friendships", "career", "community"],
            hookType: "contrarian",
            patterns: ["zoom-out", "reversal", "soft-landing"],
            qualityScore: 7.5,
            content: `The best connections in life aren't always the ones on LinkedIn.

Friends will get you way farther than most LinkedIn connections ever will.

Networking is important, and building your professional circle matters. But lifelong friends are in an entirely different league.

Jobs change, titles change, and many times we ourselves also change.

But lifelong friends stick around through all of it.

LinkedIn connections can open doors. But real friends help you figure out which doors are actually worth walking through.`
        },

        // ─────────────────────────────────────────────────────────
        // PATTERN TEACHING POSTS (diverse writing patterns)
        // ─────────────────────────────────────────────────────────
        {
            id: "pattern-01",
            category: "personal-growth",
            topicCluster: "learning",
            tags: ["consistency", "habits", "long-game", "growth"],
            hookType: "paradox",
            patterns: ["tension-then-release", "soft-landing", "zoom-out"],
            qualityScore: 8.5,
            viralMechanism: "The paradox in the hook creates cognitive friction that earns the read.",
            content: `The people who seem most consistent are not disciplined. They have just removed the choice.

Discipline implies fighting yourself. Every morning, making the hard decision again.

The consistent people I know do not fight that battle. They made the decision once and then removed the conditions under which they could un-make it. No phone by the bed. Gym clothes already on the floor. Writing app open when the laptop opens.

The battle of discipline is expensive and lossy. Designing an environment where the hard thing is also the default thing is cheap and permanent.

You do not need more willpower. You need fewer decisions.`
        },

        {
            id: "pattern-02",
            category: "founder",
            topicCluster: "surviving",
            tags: ["founder", "burnout", "mental-health", "sustainability"],
            hookType: "confession",
            patterns: ["micro-story", "naming-the-feeling", "soft-landing"],
            qualityScore: 9.0,
            viralMechanism: "Taboo topic for founders + specific details = high shares within community",
            content: `I had a complete breakdown on a Tuesday morning at 9:47am.

I know the time because I was staring at my calendar when it happened. Back-to-back calls from 10am to 7pm. A product launch the next day. A term sheet that had fallen through the night before. A co-founder who had stopped speaking to me.

I sat down on the floor of my home office and did not move for forty minutes.

Nobody talks about this part. The Tuesday mornings.

We talk about the fundraise and the launch and the growth. We talk about the lessons from failure in the past tense, once we are safe on the other side.

We do not talk about the floor.

If you are on the floor, I want you to know: it does not mean you are failing. It means you are in it. Get up, drink water, call someone who does not need something from you.

That is the whole advice.`
        },

        {
            id: "pattern-03",
            category: "technology",
            topicCluster: "building",
            tags: ["architecture", "decisions", "engineering", "tradeoffs"],
            hookType: "pattern-reveal",
            patterns: ["list-as-argument", "zoom-out", "soft-landing"],
            qualityScore: 8.0,
            content: `Every technical decision you make is a trade you will spend years paying.

Microservices trade deployment complexity for team autonomy. The trade is worth it at 100 engineers. It is not worth it at 8.

GraphQL trades flexibility for schema overhead. Worth it when your client teams are moving fast in different directions. Painful when your API is simple and stable.

NoSQL trades schema flexibility for query power. Worth it for unstructured data at scale. A mistake when your data is deeply relational and you chose it because it sounded modern.

The decision is not "what is the best technology?" The decision is "what are we trading, and can we afford the cost side of that trade today?"

Good engineers ask that question before the code is written, not after the migration has started.`
        },

        {
            id: "pattern-04",
            category: "career",
            topicCluster: "navigating",
            tags: ["quitting", "career", "decisions", "risk"],
            hookType: "contrarian",
            patterns: ["tension-then-release", "reversal", "soft-landing"],
            qualityScore: 8.5,
            content: `The riskiest career move is staying somewhere that has stopped teaching you.

We think of risk as the thing that can go wrong if we leave. We rarely calculate the risk of what goes wrong if we stay.

Eighteen months in a role where you are not growing means eighteen months of skills not acquired, relationships not built, and opportunities not pursued. That cost is invisible because it does not appear on a bank statement.

The opportunity cost of safety is real. It is just denominated in futures instead of present losses, which makes it easy to ignore.

Ask yourself: if you stay for two more years, what will you be able to do that you cannot do today? If the answer is "about the same things I can do now," you are not playing it safe. You are paying compound interest on stagnation.`
        },

        {
            id: "pattern-05",
            category: "linkedin-growth",
            topicCluster: "growing",
            tags: ["writing", "voice", "authenticity", "linkedin"],
            hookType: "direct-challenge",
            patterns: ["zoom-in", "naming-the-feeling", "hard-cta"],
            qualityScore: 8.5,
            content: `Your LinkedIn posts sound like everyone else's because you are writing what you think a LinkedIn post should sound like.

There is a genre. Professional. Inspirational. Third-person humble. Present-tense lessons. Numbered takeaways.

You have read so many of them that you automatically write in that register. Your actual voice — the way you explain something to a colleague, or complain to a friend, or think through a problem out loud — is nowhere on the page.

The posts that perform are the ones that sound like a specific person who has seen a specific thing and has something specific to say about it.

Write the next post as if you are explaining it to someone you actually know. Read it back. If it sounds like it could have been written by anybody in your industry, throw it away and start again with a different first sentence.`
        }
    ]
};

// ============================================================
// RETRIEVAL LOGIC v2
// ============================================================

/**
 * Multi-signal retrieval with topic cluster awareness, hook diversity,
 * and quality-weighted scoring.
 *
 * Improvements over v1:
 *  - Adds topic cluster matching (higher weight than single tag)
 *  - Quality score is a multiplier so low-quality posts rarely surface
 *  - Includes hook diversity: avoid returning two posts with identical hookType
 *  - Fuzzy keyword expansion for common synonyms
 * 
 * Future improvement: replace keyword matching with embedding similarity
 * once the post library exceeds 200 items.
 */

const SYNONYM_MAP: Record<string, string[]> = {
    "ai":            ["artificial intelligence", "llm", "machine learning", "gpt", "automation"],
    "startup":       ["founder", "early-stage", "bootstrapped", "venture"],
    "productivity":  ["focus", "time management", "deep work", "habits", "systems"],
    "career":        ["job", "work", "promotion", "salary", "interview", "hiring"],
    "saas":          ["software", "product", "subscription", "b2b", "platform"],
    "linkedin":      ["personal brand", "content", "audience", "followers", "posts"],
    "leadership":    ["management", "team", "manager", "culture", "executive"],
    "growth":        ["scale", "expand", "acquisition", "retention", "churn"],
    "sales":         ["closing", "pipeline", "deal", "revenue", "prospect"],
    "writing":       ["content", "copy", "storytelling", "communication"],
};

function expandTopicTerms(topic: string): string[] {
    const words = topic.toLowerCase().split(/[\s,.-]+/);
    const expanded = new Set(words);
    for (const word of words) {
        for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
            if (word.includes(key) || synonyms.some(s => word.includes(s))) {
                expanded.add(key);
                synonyms.forEach(s => expanded.add(s));
            }
        }
    }
    return Array.from(expanded);
}

export function getRelevantMemoryPosts(
    topic: string,
    maxPosts: number = 3,
    enforceHookDiversity: boolean = true
): ReferencePost[] {
    const topicWords = expandTopicTerms(topic);

    const scoredPosts = DEFAULT_STYLE_MEMORY.referencePosts.map(post => {
        let score = 0;

        // Topic cluster match (strongest signal — 4 pts)
        if (topicWords.some(w => post.topicCluster.includes(w))) score += 4;

        // Category match (3 pts)
        if (topicWords.some(w => post.category.toLowerCase().includes(w))) score += 3;

        // Tag match (1 pt each)
        post.tags.forEach(tag => {
            if (topicWords.some(w => tag.toLowerCase().includes(w) || w.includes(tag.toLowerCase()))) {
                score += 1;
            }
        });

        // Quality multiplier — prevents low-quality posts from surfacing even with good tag match
        const qualityMultiplier = post.qualityScore / 10;
        const finalScore = score * qualityMultiplier;

        return { post, rawScore: score, finalScore };
    });

    scoredPosts.sort((a, b) => b.finalScore - a.finalScore);

    // Fallback: if all scores are 0, return highest quality posts across diverse clusters
    if (scoredPosts[0].finalScore === 0) {
        return DEFAULT_STYLE_MEMORY.referencePosts
            .sort((a, b) => b.qualityScore - a.qualityScore)
            .slice(0, maxPosts);
    }

    // Hook diversity filter: don't return two posts with the same hookType
    if (enforceHookDiversity) {
        const selected: ReferencePost[] = [];
        const usedHookTypes = new Set<HookType>();

        for (const { post } of scoredPosts) {
            if (selected.length >= maxPosts) break;
            if (!usedHookTypes.has(post.hookType)) {
                selected.push(post);
                usedHookTypes.add(post.hookType);
            } else if (selected.length < maxPosts - 1) {
                // Allow a repeat hookType if we are short on results
                selected.push(post);
            }
        }
        return selected;
    }

    return scoredPosts.slice(0, maxPosts).map(sp => sp.post);
}

/**
 * Get posts filtered by minimum quality score.
 * Useful for premium-tier users or elite style injection.
 */
export function getElitePosts(minScore: number = 9.0, maxPosts: number = 3): ReferencePost[] {
    return DEFAULT_STYLE_MEMORY.referencePosts
        .filter(p => p.qualityScore >= minScore)
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, maxPosts);
}

/**
 * Get posts by writing pattern.
 * Useful for targeted style injection: e.g., user wants to write a story post.
 */
export function getPostsByPattern(pattern: WritingPattern, maxPosts: number = 2): ReferencePost[] {
    return DEFAULT_STYLE_MEMORY.referencePosts
        .filter(p => p.patterns.includes(pattern))
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, maxPosts);
}

/**
 * Get posts by hook type.
 * Useful for when the AI knows it needs to write a contrarian hook,
 * confession hook, etc.
 */
export function getPostsByHookType(hookType: HookType, maxPosts: number = 2): ReferencePost[] {
    return DEFAULT_STYLE_MEMORY.referencePosts
        .filter(p => p.hookType === hookType)
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, maxPosts);
}