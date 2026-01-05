
// Based on Anki's rslib/src/scheduler & card/mod.rs
// Implements a V3-like Scheduler in TypeScript

export enum CardType {
    New = 0,
    Learn = 1,
    Review = 2,
    Relearn = 3,
}

export enum CardQueue {
    New = 0,
    Learn = 1, // Due is timestamp
    Review = 2, // Due is days
    DayLearn = 3, // Due is days
    Suspended = -1,
    SchedBuried = -2,
    UserBuried = -3,
}

export enum Rating {
    Again = 'again',
    Hard = 'hard',
    Good = 'good',
    Easy = 'easy',
}

export interface Card {
    id: string; // Using string ID for Firebase
    deckId: string;
    noteId: string;

    ctype: CardType;
    queue: CardQueue;
    due: number; // Timestamp (seconds) for Learn, Days for Review
    interval: number; // Days
    ease_factor: number; // e.g. 2500 for 250%
    reps: number;
    lapses: number;
    remaining_steps: number; // Steps left in current learning phase

    // Data fields
    modelType?: 'basic' | 'cloze'; // Default 'basic'
    media?: string[]; // Array of image URLs
    data?: string;
    front: string;
    back: string;
}



export interface DeckConfig {
    learn_steps: number[]; // Minutes, e.g. [1, 10]
    relearn_steps: number[]; // Minutes, e.g. [10]
    new_per_day: number;
    reviews_per_day: number;
    initial_ease: number; // 2500
    easy_multiplier: number; // 1.3
    hard_multiplier: number; // 1.2
    lapse_multiplier: number; // 0
    interval_multiplier: number; // 1.0
    maximum_review_interval: number; // 36500
    minimum_lapse_interval: number; // 1
    graduating_interval_good: number; // 1 day
    graduating_interval_easy: number; // 4 days
    leech_threshold: number; // 8
}

export const DEFAULT_DECK_CONFIG: DeckConfig = {
    learn_steps: [1, 10], // 1m, 10m
    relearn_steps: [10], // 10m
    new_per_day: 20,
    reviews_per_day: 200,
    initial_ease: 2500,
    easy_multiplier: 1300, // Stored as * 1000 in Anki, using 1300 for consistency or 1.3 float? 
    // Rust code uses fields like easy_multiplier: 1.3 but initial_ease as 2.5
    // Let's stick to float multipliers for math, but integer for ease_factor (2500)
    hard_multiplier: 1.2,
    interval_multiplier: 1.0,
    maximum_review_interval: 36500,
    minimum_lapse_interval: 1,
    lapse_multiplier: 0,
    graduating_interval_good: 1,
    graduating_interval_easy: 4,
    leech_threshold: 8,
};

// Helper constants
const SECONDS_IN_DAY = 86400;
const SECONDS_IN_MINUTE = 60;

export class AnkiScheduler {
    private config: DeckConfig;

    constructor(config: DeckConfig = DEFAULT_DECK_CONFIG) {
        this.config = config;
    }

    // --- Time Helpers ---
    private nowSecs(): number {
        return Math.floor(Date.now() / 1000);
    }

    private daysSinceCreation(creationTimestamp: number): number {
        // Approximate for Review Queue due dates
        return Math.floor((this.nowSecs() - creationTimestamp) / SECONDS_IN_DAY);
    }

    // --- Fuzzing ---
    // Anki adds a small random amount to intervals to prevent bunching
    private fuzzIvl(ivl: number): number {
        if (ivl < 2) return ivl;
        // Range: [ivl - fuzz, ivl + fuzz]
        // Anki's actual fuzz ranges vary by interval size
        let fuzz = 0;
        if (ivl < 3) fuzz = 0;
        else if (ivl < 7) fuzz = 1;
        else if (ivl < 30) fuzz = Math.max(1, Math.floor(ivl * 0.15));
        else fuzz = Math.max(2, Math.floor(ivl * 0.05));

        // Simplified fuzz: +/- 5%
        const min = Math.max(2, ivl - fuzz);
        const max = ivl + fuzz;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- Answering Logic ---

    public answerCard(card: Card, rating: Rating): Card {
        // Clone to avoid mutation side-effects before return
        const c = { ...card };
        const now = this.nowSecs();

        c.reps += 1;

        if (c.ctype === CardType.New || c.ctype === CardType.Learn || c.ctype === CardType.Relearn) {
            this.answerLearningCard(c, rating, now);
        } else if (c.ctype === CardType.Review) {
            this.answerReviewCard(c, rating, now);
        }

        // Apply global caps
        if (c.interval > this.config.maximum_review_interval) {
            c.interval = this.config.maximum_review_interval;
        }

        // Ensure ease doesn't drop below 1300 (130%)
        if (c.ease_factor < 1300) c.ease_factor = 1300;

        return c;
    }

    private answerLearningCard(c: Card, rating: Rating, now: number) {
        // Determine steps list based on type
        const steps = c.ctype === CardType.Relearn ? this.config.relearn_steps : this.config.learn_steps;

        // Initialize learning state if New
        if (c.ctype === CardType.New) {
            c.ctype = CardType.Learn;
            c.remaining_steps = steps.length;
        }

        if (rating === Rating.Again) {
            // Fail: Reset to first step
            c.remaining_steps = steps.length;
            this.rescheduleLearning(c, steps[0], now);
        } else if (rating === Rating.Hard) {
            // Repeat current step, but with progression?
            // User feedback: "Looping" is annoying.
            // Fix: Hard should push it slightly further, potentially out of the immediate <3m session.
            // Anki V2 style: Average of current step and next step.
            // Step 1 (1m), Step 2 (10m) -> Avg = 5.5m.
            
            const currentStepIdx = Math.max(0, steps.length - c.remaining_steps);
            const currentDelay = steps[currentStepIdx] || steps[0];
            const nextDelay = steps[currentStepIdx + 1] || currentDelay * 2; // Fallback if last step
            
            const newDelay = Math.floor((currentDelay + nextDelay) / 2);
            this.rescheduleLearning(c, newDelay, now);
        } else if (rating === Rating.Good) {
             // Advance step
             if (c.remaining_steps > 1) {
                 // Move to next step
                 c.remaining_steps -= 1;
                 const nextStepIdx = steps.length - c.remaining_steps;
                 const delay = steps[nextStepIdx];
                 this.rescheduleLearning(c, delay, now);
             } else {
                 // Graduate
                 this.graduateCard(c, false);
             }
        } else if (rating === Rating.Easy) {
            // Graduate immediately
            this.graduateCard(c, true);
        }
    }

    private rescheduleLearning(c: Card, delayMinutes: number, now: number) {
        c.queue = CardQueue.Learn;
        c.due = now + (delayMinutes * SECONDS_IN_MINUTE);
        // Interval stays 0 or previous val until graduation
    }

    private graduateCard(c: Card, easy: boolean) {
        c.ctype = CardType.Review;
        c.queue = CardQueue.Review;
        c.remaining_steps = 0;

        // Initial Interval
        if (easy) {
            c.interval = this.config.graduating_interval_easy;
            c.ease_factor = this.config.initial_ease; // Should already be set, but ensure
        } else {
            c.interval = this.config.graduating_interval_good;
            // Ease remains default
        }

        // Apply fuzz to interval
        // c.interval = this.fuzzIvl(c.interval); // Fuzz usually applied on review, but good to apply here too

        // For Review cards, due is in Days. 
        // We set due to (Today + Interval)
        // Since we don't track "Today" index globally, let's use timestamp for everything in this MVP for simplicity?
        // OR adhere to Anki's "days since creation" or "days since epoch".
        // Let's use Timestamp for due for Review cards too, to keep it simple with Firebase. 
        // due = now + interval * days
        c.due = this.nowSecs() + (c.interval * SECONDS_IN_DAY);
    }

    private answerReviewCard(c: Card, rating: Rating, now: number) {
        let newInt = c.interval;

        if (rating === Rating.Again) {
            // Lapse
            c.ctype = CardType.Relearn;
            c.queue = CardQueue.Learn;
            c.lapses += 1;
            c.ease_factor = Math.max(1300, c.ease_factor - 200);
            c.interval = Math.max(1, Math.floor(c.interval * this.config.lapse_multiplier)); // Usually lapse mult is 0 -> interval 1

            c.remaining_steps = this.config.relearn_steps.length;
            // Schedule for first relearn step
            this.rescheduleLearning(c, this.config.relearn_steps[0], now);
            return; // Done
        } else if (rating === Rating.Hard) {
            c.ease_factor = Math.max(1300, c.ease_factor - 150);
            newInt = Math.floor(c.interval * this.config.hard_multiplier);
        } else if (rating === Rating.Good) {
            // Ease unchanged
            newInt = Math.floor(c.interval * (c.ease_factor / 1000));
        } else if (rating === Rating.Easy) {
            c.ease_factor += 150;
            // Easy bonus + Ease
            newInt = Math.floor(c.interval * (c.ease_factor / 1000) * (this.config.easy_multiplier / 1000)); // 1.3
        }

        // Apply Interval Modifier (config)
        newInt = Math.floor(newInt * this.config.interval_multiplier);

        // Sanity check: Review interval must increase (unless hard sometimes)
        if (rating === Rating.Good && newInt <= c.interval) newInt = c.interval + 1;
        if (rating === Rating.Easy && newInt <= c.interval) newInt = c.interval + 1;

        // Fuzz
        c.interval = this.fuzzIvl(newInt);

        c.queue = CardQueue.Review;
        c.due = now + (c.interval * SECONDS_IN_DAY);
    }

    // --- UI Helpers ---
    public getNextIntervals(card: Card): Record<Rating, string> {
        // Return string representations like "10m", "4d", "1.2mo"
        // This simulates the "Prediction" logic for buttons
        // For MVP, simplified labels
        return {
            [Rating.Again]: '1m',
            [Rating.Hard]: 'Hard',
            [Rating.Good]: 'Good',
            [Rating.Easy]: 'Easy'
        };
    }

    public migrateLegacyCard(legacyCard: any): Card {
        const now = this.nowSecs();

        // Map old 'state' to 'ctype'
        let ctype = CardType.New;
        if (legacyCard.ctype !== undefined) {
             ctype = legacyCard.ctype;
        } else {
            // Legacy Migration
            if (legacyCard.state === 'learning') ctype = CardType.Learn;
            else if (legacyCard.state === 'review') ctype = CardType.Review;
            else if (legacyCard.state === 'relearning') ctype = CardType.Relearn;
        }

        // Ensure defaults
        return {
            id: legacyCard.id,
            deckId: legacyCard.deckId || 'default',
            noteId: legacyCard.noteId || legacyCard.id,
            front: legacyCard.front || '',
            back: legacyCard.back || '',

            ctype: ctype,
            queue: legacyCard.queue !== undefined ? legacyCard.queue : CardQueue.New,
            // V3 'due' (seconds) > Legacy 'dueDate' (ms) > Default (now)
            due: legacyCard.due !== undefined ? legacyCard.due : (legacyCard.dueDate ? Math.floor(legacyCard.dueDate / 1000) : now),

            interval: legacyCard.interval || 0,
            ease_factor: legacyCard.ease_factor || (legacyCard.ease ? legacyCard.ease * 1000 : 2500),
            reps: legacyCard.reps || legacyCard.step || 0,
            lapses: legacyCard.lapses || 0,
            remaining_steps: legacyCard.remaining_steps || 0,
        };
    }

    // --- Statistics ---
    public getDeckCounts(cards: Card[]): { new: number, learn: number, review: number } {
        const now = this.nowSecs();
        const counts = { new: 0, learn: 0, review: 0 };

        for (const card of cards) {
            // New
            if (card.ctype === CardType.New) {
                counts.new++;
            }
                // Learn / Relearn (Count if due or in learning)
            else if (card.ctype === CardType.Learn || card.ctype === CardType.Relearn) {
                // In Anki, "Learn" count usually includes ALL learning cards, or those due?
                // Usually "Due" column shows due counts.
                // WE CHANGE: Include cards due within 20 mins (1200s) to allow Learn Ahead
                if (card.due <= now + 1200) counts.learn++;
            }
            // Review
            else if (card.ctype === CardType.Review) {
                if (card.due <= now) counts.review++;
            }
        }
        return counts;
    }

    public formatCardContent(text: string, side: 'front' | 'back', modelType: string = 'basic'): string {
        if (modelType === 'cloze') {
            if (side === 'front') {
                return text.replace(/\{\{c\d+::(.*?)\}\}/g, "[...]");
            } else {
                return text.replace(/\{\{c\d+::(.*?)\}\}/g, "<span class='cloze-reveal'>$1</span>");
            }
        }
        return text;
    }
}
