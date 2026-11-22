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

## Conversation fade refinements

- Conversation switching animates the complete top-left heading (title, status dot, subtitle, separator, and UI DEMO) together: it fades/slides left, then the new heading fades/slides in from the left. The topbar container, its buttons, and the composer remain stationary; participant portraits and messages keep their own localized fades.
- The conversation area fades into place on initial page load, alongside the staggered sidebar reveal. Because demo history resets on refresh, the first newly created private conversation or agent meeting also receives a one-time entrance fade. Subsequent messages do not retrigger it.

## Simulated response bubbles

- When a user sends a message, the addressed agent immediately displays a transient **three-dot typing bubble** for a random **0.33–1.66 seconds** (330–1660 ms), then posts the scripted reply.
- The animated dots also appear in private whispers during that wait.
- Agent portraits and names remain visible, and the existing reply typewriter starts after the bubble disappears.
- Pending indicators exist only in page memory, never enter the transcript, and are excluded from TXT/Markdown exports. They are recreated when returning to a conversation with an outstanding response.
- The **Animations ON/OFF** control can stop the dot bounce without removing the simulated wait.

## Conversation wallpapers

New private conversations and meetings automatically receive a randomized wallpaper from the three existing UUID-named PNG artworks in `World/`. Each chat retains its assigned wallpaper when switching between conversations. The three images are shuffled before any repeat, and meeting backgrounds preserve the GRID pattern. A dark overlay keeps messages legible. Wallpapers are ephemeral, reset on refresh, and do not appear in the empty welcome screen.
