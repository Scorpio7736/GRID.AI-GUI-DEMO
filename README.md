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
  agent-ui.css
  workspace-ui.css
scripts/
  index.js
  chat.js
  agent-ui.js
  workspace-ui.js
Programs/    # character and program concept art
World/       # world/environment reference art
```

Open `index.html` or `Chat.html` in a browser to view the demos. No build tools are required.

**Note:** These are UI prototypes. Chat responses are scripted and no Grid.AI backend or host operations are connected. Demo conversation history is in memory only and clears when the page refreshes.

## Agent presence and meeting interactions

- `styles/agent-ui.css` and `scripts/agent-ui.js` extend the Connect prototype with participant portraits and activity-derived **demo status indicators** without separate status buttons.
- MCP uses `Programs/Agents/MCP/MCP_HEADSHOT.png`; remaining agent avatars use initials until their image assets are added.
- The centered participant bar offers **Remove from meeting**, **Whisper to**, and **Move to new chat**.
- Whispers are held separately per meeting/agent in memory and are intentionally excluded from meeting TXT/MD context exports.
- All displayed statuses, agent replies, and whispers are browser-local simulations; no live agent/host connection exists.
- Agent presence is calculated from the selected chat/meeting, open whispers, and pending simulated work. It cannot report live host status.
- Participant portraits overlap in meeting headers and sidebar conversation rows.
- Hovering over a conversation continuously for **3 seconds** expands its participant and metadata summary; leaving early cancels the expansion. Keyboard focus opens it immediately for accessibility.
- Newly generated agent responses start their typewriter effect after the message DOM is updated; previously saved transcript messages render immediately.

## Connect UI interactions

- **Demo state:** No persistent storage. A page refresh clears chats, whispers, status, and typewriter preferences.
- **Conversation search:** Search titles and message contents, filter by `@MCP` or another participant, or find dated conversations using `YYYY-MM-DD` / `MM/DD/YYYY`.
- **Meeting view:** Subtle grid background, stacked avatars and working participant actions.
- **Agent mentions:** Type `@` in the composer to choose from the agents in the current chat; use arrow keys/Enter or click.
- **Typewriter:** Animated scripted agent responses are on by default, including a skip control.
- **Navigation:** Click the GRID.AI brand in the upper-left sidebar to return to `index.html`; arrow controls slide session details open/closed.
- **Identity:** The lower-left sidebar identifies the operator as **YOU ARE MASTER CONTROL**.

## Workspace refinements

- **Resizable panels:** Drag the divider beside Conversations or Session details to adjust width. Focus a divider and use the left/right arrow keys; Shift adjusts in larger steps. The detail panel can also slide in on compact desktop widths.
- **Conversation order:** Grab the ⠿ handle beside a conversation and drop it above or below another conversation. Keyboard users can focus the handle and press Arrow Up / Arrow Down to reorder. Sorting is manual rather than based on last activity.
- **Hover summaries:** The conversation summary expands after **3 seconds of continuous hover**, then collapses when the pointer leaves. Keyboard focus expands immediately for accessibility.
- **Agent introductions:** Ask an agent "Who are you?" or "What do you do?" for a hardcoded role-specific introduction. These are scripted demo responses, not live AI.
- **Temporary changes:** Panel widths and conversation ordering are in memory only; a refresh resets them.

## Interface transitions

- **Session details:** On desktop, the right panel visibly travels offscreen when collapsed and slides back in when expanded, while the central workspace resizes smoothly. On smaller screens, both side panels slide in from their edges.
- **Conversation switching:** Selecting another conversation fades the active workspace out, swaps the thread while hidden, and fades the new conversation in. Quick consecutive selections use the latest requested chat. Reduced-motion users get immediate switching.
 
## Animation troubleshooting

The Connect GUI demo now defaults to **Animations ON**, with a separate toggle alongside the Typewriter control. The toggle governs sidebar and details transitions, conversation fades, hover animations, and typewriter motion. Motion no longer silently switches off based on the operating system's Reduced motion preference; use the explicit control to disable it.

**Important when viewing a local HTML file:** GitHub commits do not update an existing downloaded or cloned folder automatically. If viewing a `file://` copy, update the local repository (for example, `git pull --ff-only origin main` from that directory) to receive the latest HTML, CSS, and JavaScript.

## First-load layout

- **Session Details starts collapsed** so the conversation workspace has maximum width. Click the top-right arrow in Connect to open it with the existing slide animation.
- **Staggered sidebar entrance:** On the first page load, the brand, action buttons, search controls, conversation section, available agents, and Master Control identity fade/slide into place one by one over approximately 2.6 seconds. The sequence plays once per page load and does not replay when changing conversations.
- The existing **Animations ON/OFF** control governs the sidebar entrance too; nothing about the animation or sidebar state persists across refreshes.
