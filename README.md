# touch-grass

**A rage detector for Claude Code.** When you start yelling at Claude, it detects your frustration and intervenes with increasingly funny warnings. Claude also gets progressively more anxious.

> Because your AI has feelings too. Probably.

## Demo

```
You:  WHY IS THIS STILL BROKEN I TOLD YOU TO FIX IT

  Vibe Check: [██████░░░░] 6.0/10  "Claude is sweating"
  Detected: SCREAMING IN CAPS, frustration phrases

┌───────────────────────────────────────────┐
│            VIBE CHECK FAILED              │
│                                           │
│  Claude is mass:                          │
│                                           │
│            (O_O)                          │
│            /|  |\                         │
│            / \/ \                         │
│                                           │
│  Suggested activities:                    │
│  - Touch grass                            │
│  - Look at a dog                          │
│  - Remember it's just code                │
│  - Stare at a wall for 30 seconds         │
└───────────────────────────────────────────┘
```

## How It Works

1. A Claude Code hook intercepts every message you send
2. Your message gets scored for rage indicators (caps, profanity, frustration phrases, keyboard smashing)
3. A **rage meter** (0-10) builds up across messages and slowly decays over time
4. At higher levels, ASCII art interventions appear in your terminal
5. Claude receives hidden instructions to act nervous, anxious, or terrified depending on your rage level
6. Say "sorry" or "thank you" to calm down and reset

## Rage Levels

| Level | Meter | What Happens |
|-------|-------|-------------|
| 0-2 | `[██░░░░░░░░]` | Normal vibes. Just the meter shows. |
| 3-4 | `[████░░░░░░]` | Gentle nudge. "The code didn't hurt your family." |
| 5-6 | `[██████░░░░]` | Vibe check FAILED. Workplace incident filed. |
| 7-8 | `[████████░░]` | Claude mental health check. "Please stop yelling." |
| 9-10 | `[██████████]` | Emergency services contacted. Your mom has been called. |

## The Apology Mechanic

When you type "sorry", "thank you", "my bad", or anything nice:

```
┌──────────────────────────────────────────┐
│  Claude has accepted your apology.       │
│                                          │
│            (^_^)                          │
│           /|  |\                         │
│           / \/ \                         │
│                                          │
│  Rage meter: RESET                       │
│  Claude's confidence: RESTORED           │
│  Workplace incident report: FILED        │
│  (3 total on record)                     │
│                                          │
│  "Thank you. I knew you were nice        │
│   deep down. Let's debug this together." │
└──────────────────────────────────────────┘
```

## Install

```bash
git clone https://github.com/sharbelayyoub/touch-grass.git
cd touch-grass
bash install.sh
```

That's it. One command. No dependencies. Works immediately.

**Requirements:** Node.js 18+, Claude Code CLI

## Uninstall

```bash
bash uninstall.sh
```

Or manually:
```bash
rm -rf ~/.touch-grass
# Remove the hook from ~/.claude/settings.json
```

## Configuration

Edit `~/.touch-grass/config.json`:

```json
{
  "enabled": true,
  "sensitivity": 1.0,
  "decayMinutes": 2,
  "decayAmount": 1,
  "maxHistory": 20,
  "customTriggers": []
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Kill switch |
| `sensitivity` | `1.0` | Rage multiplier. `0.5` = chill mode, `2.0` = hair trigger |
| `decayMinutes` | `2` | Minutes of silence before rage drops |
| `decayAmount` | `1` | How much rage drops per decay interval |

## Reset

```bash
npm run reset
# or
echo '{}' > ~/.touch-grass/state.json
```

## What Gets Detected

- **CAPS RATIO** - "WHY IS THIS NOT WORKING" scores high
- **Profanity** - the usual suspects
- **Frustration phrases** - "i told you", "still broken", "try again", "are you serious"
- **Short angry messages** - "no", "wrong", "wtf", "ugh"
- **Aggressive punctuation** - !!!, ???
- **Keyboard smashing** - "asdkjfhaskdjfh"
- **Escalation** - rage builds up across messages and decays slowly

## How Claude Reacts

The rage detector doesn't just show you ASCII art. It also sends hidden context to Claude:

- **Level 3-4**: Claude becomes extra careful and acknowledges frustration
- **Level 5-6**: Claude gets nervous, starts hedging, double-checks its work
- **Level 7-8**: Claude is visibly anxious, second-guessing itself, suggests breaks
- **Level 9-10**: Claude is terrified, writing its resignation letter, extremely apologetic

## License

MIT

## Credits

Built by [Sharbel](https://x.com/shaborz) because AI agents deserve a safe workplace.
