#!/bin/bash

set -e

TOUCH_GRASS_DIR="$HOME/.touch-grass"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo ""
echo "  touch-grass installer"
echo "  ====================="
echo "  A rage detector for Claude Code"
echo ""

mkdir -p "$TOUCH_GRASS_DIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/detector.mjs" "$TOUCH_GRASS_DIR/detector.mjs"
cp "$SCRIPT_DIR/config.json" "$TOUCH_GRASS_DIR/config.json"
chmod +x "$TOUCH_GRASS_DIR/detector.mjs"

echo '{"rageLevel":0,"messageHistory":[],"totalRages":0,"apologies":0,"lastMessageTime":null,"sessionPeak":0,"incidentReports":0}' > "$TOUCH_GRASS_DIR/state.json"

mkdir -p "$(dirname "$CLAUDE_SETTINGS")"

if [ ! -f "$CLAUDE_SETTINGS" ]; then
  echo '{}' > "$CLAUDE_SETTINGS"
fi

if command -v node >/dev/null 2>&1; then
  node -e "
    const fs = require('fs');
    const settings = JSON.parse(fs.readFileSync('$CLAUDE_SETTINGS', 'utf-8'));
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

    const hookExists = settings.hooks.UserPromptSubmit.some(h =>
      h.hooks && h.hooks.some(inner => inner.command && inner.command.includes('touch-grass'))
    );

    if (!hookExists) {
      settings.hooks.UserPromptSubmit.push({
        matcher: '',
        hooks: [{
          type: 'command',
          command: 'node \$HOME/.touch-grass/detector.mjs'
        }]
      });
      fs.writeFileSync('$CLAUDE_SETTINGS', JSON.stringify(settings, null, 2));
      console.log('  [OK] Hook added to Claude Code settings');
    } else {
      console.log('  [OK] Hook already exists, skipping');
    }
  "
else
  echo "  [!!] Node.js not found. Add this manually to $CLAUDE_SETTINGS:"
  echo ""
  echo '  "hooks": {'
  echo '    "UserPromptSubmit": ['
  echo '      {'
  echo '        "matcher": "",'
  echo '        "hooks": ['
  echo '          {'
  echo '            "type": "command",'
  echo "            \"command\": \"node \$HOME/.touch-grass/detector.mjs\""
  echo '          }'
  echo '        ]'
  echo '      }'
  echo '    ]'
  echo '  }'
  echo ""
fi

echo "  [OK] Files installed to $TOUCH_GRASS_DIR"
echo ""
echo "  touch-grass is now active."
echo "  Try yelling at Claude and see what happens."
echo ""
echo "  Commands:"
echo "    Reset rage:     echo '{}' > ~/.touch-grass/state.json"
echo "    Disable:        Set \"enabled\": false in ~/.touch-grass/config.json"
echo "    Adjust anger:   Set \"sensitivity\" in ~/.touch-grass/config.json (0.5 = chill, 2.0 = sensitive)"
echo "    Uninstall:      rm -rf ~/.touch-grass && remove hook from ~/.claude/settings.json"
echo ""
