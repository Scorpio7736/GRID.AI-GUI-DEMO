# GRID.AI - GUI Demo

Standalone HTML, CSS, and JavaScript prototypes for the [Grid.AI](https://github.com/Scorpio7736/Grid.AI) graphical user interface.

## Pages

- `index.html` — minimal entry-page placeholder; renders “Hello World” from JavaScript.
- `Chat.html` — Grid.AI Connect conversation prototype, including simulated agent chats, meetings, context exports, and a typewriter response effect.

## Project structure

```text
index.html
Chat.html
styles/
  index.css
  chat.css
scripts/
  index.js
  chat.js
Programs/    # character and program concept art
World/       # world/environment reference art
```

Open `index.html` or `Chat.html` in a browser to view the demos. No build tools are required.

**Note:** These are UI prototypes. Chat responses are scripted and no Grid.AI backend or host operations are connected. Demo conversation history is stored in browser local storage.

## Agent presence and meeting interactions

- `styles/agent-ui.css` and `scripts/agent-ui.js` extend the Connect prototype with participant portraits and activity-derived **demo status indicators**.
- MCP uses `Programs/Agents/MCP/MCP_HEADSHOT.png`; remaining agent avatars use initials until their image assets are added.
- The centered participant bar offers **Remove from meeting**, **Whisper to**, and **Move to new chat**.
- Whispers are saved separately per meeting/agent in browser-local history and are intentionally excluded from meeting TXT/MD context exports.
- All displayed statuses, agent replies, and whispers are browser-local simulations; no live agent/host connection exists.
- Agent presence is calculated from the selected chat/meeting, open whispers, and pending simulated work. It cannot report live host status.
- Participant portraits overlap in meeting headers and sidebar conversation rows.
- Hovering or keyboard-focusing a conversation expands its participant and metadata summary.
- Newly generated agent responses start their typewriter effect after the message DOM is updated; previously saved transcript messages render immediately.
