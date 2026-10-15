# session-usage

A Claude Code mod that shows how full the session's context window is, in a slim band
above the prompt: the percentage, then a bar split into the same colored segments the
desktop app's context menu uses (Messages, System tools, MCP tools, Memory files, and
everything else in grey).

The percentage turns orange at 80% and red at 90%. On the terminal, which can't draw the
bar, it shows the percentage alone.

It costs nothing to run. The breakdown is estimated locally after each turn, with no API
requests and no tokens.

## Install

In a terminal Claude Code session:

```
/plugin install session-usage --marketplace danhere/session-usage
```

Answer `y` to add the marketplace, then pick a scope. Installed at the user scope, it also
loads in the desktop app's Code tab.

## Develop

```bash
claude plugin validate .
claude plugin test .
```
