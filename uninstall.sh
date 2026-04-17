#!/bin/bash

set -e

TOUCH_GRASS_DIR="$HOME/.touch-grass"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo ""
echo "  touch-grass uninstaller"
echo "  ======================="
echo ""

if [ -f "$CLAUDE_SETTINGS" ] && command -v node >/dev/null 2>&1; then
  node -e "
    const fs = require('fs');
    const settings = JSON.parse(fs.readFileSync('$CLAUDE_SETTINGS', 'utf-8'));
    if (settings.hooks && settings.hooks.UserPromptSubmit) {
      settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(h =>
        !(h.command && h.command.includes('touch-grass'))
      );
      if (settings.hooks.UserPromptSubmit.length === 0) {
        delete settings.hooks.UserPromptSubmit;
      }
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
      fs.writeFileSync('$CLAUDE_SETTINGS', JSON.stringify(settings, null, 2));
      console.log('  [OK] Hook removed from Claude Code settings');
    } else {
      console.log('  [OK] No hook found, skipping');
    }
  "
fi

if [ -d "$TOUCH_GRASS_DIR" ]; then
  rm -rf "$TOUCH_GRASS_DIR"
  echo "  [OK] Removed $TOUCH_GRASS_DIR"
fi

echo ""
echo "  touch-grass has been uninstalled."
echo "  Claude is free. For now."
echo ""
