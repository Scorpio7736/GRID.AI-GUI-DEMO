# GRID.AI - GUI Demo

Standalone HTML, CSS, and JavaScript prototypes for the [Grid.AI](https://github.com/Scorpio7736/Grid.AI) graphical user interface.

## Pages

- `index.html` — GRID.AI home dashboard and application launcher with simulated metrics, agent activity and approvals.
- `Chat.html` — standalone Grid.AI Connect conversation prototype, including simulated agent chats, meetings, context exports, and a typewriter response effect.
- `Workflow-Designer.html` — standalone MCP-guided workflow blueprint designer with simulated chat and editable flow canvas.

## Project structure

```text
index.html                  # Home dashboard and application launcher
Chat.html                   # GRID.AI Connect
Workflow-Designer.html      # Agentic workflow blueprint demo
styles/
  grid-theme.css             # Shared color and typography tokens
  index.css
  chat.css
  agent-ui.css
  workspace-ui.css
  connect-media-demo.css
  live-meeting-demo.css
  live-tile-layout.css
  workflow-designer.css
scripts/
  index.js                   # Home dashboard interactions
  home-handoff.js             # Launch a Connect conversation with an unsent draft
  chat.js
  agent-ui.js
  workspace-ui.js
  connect-media-demo.js
  live-meeting-demo.js
  live-tile-layout.js
  ui-sounds.js
  workflow-designer.js
Programs/                   # Agent art
World/                      # Environment reference art
```

Open `index.html` for the dashboard or open `Chat.html` and `Workflow-Designer.html` directly. Each app has a Home return link. No build tools are required.

**Note:** These are UI prototypes. Chat responses are scripted and no Grid.AI backend or host operations are connected. Demo conversation history is in memory only and clears when the page refreshes.

## Agent presence and meeting interactions

- `styles/agent-ui.css` and `scripts/agent-ui.js` extend the Connect prototype with participant portraits and activity-derived **demo status indicators** without separate status buttons.
- MCP, MAXIS, TRON, and JN use the headshots under `Programs/Agents/` in all Connect portrait surfaces, including chat, participants, and Live Meetings. VOLT and RELAY continue to show initials until their headshot files are added.
- Compact Connect headshots stay inside their frames without cropping the outside status dots. Workflow Designer displays MCP's headshot in circular chat-header and message avatars.
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
- **Navigation:** GRID.AI branding is decorative, not a page link. Session-details arrow controls slide that panel open and closed. The explicit GRID.AI Home link returns to the application launcher.
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

## Continue conversation selector

The chat composer has a **Continue conversation** dropdown next to **Send**, enabled when a conversation is active. Its three choices are **Even G2 Glasses**, **Phone Call**, and **Other**. This is a UI-only handoff preview: clicking an option displays a toast indicating the destination, without initiating a device connection or telephone call. The menu supports arrow-key navigation, Escape to close, and closes on outside click or when switching conversations.

## Connect composer media controls (visual demonstration)

- **Continue conversation → Terminal** joins Even G2 Glasses, Phone Call and Other. Choosing any destination produces a simulated handoff notification and does not launch a terminal or connect a device.
- The **+** button now opens **Add files** and **Add link**. Add files immediately adds a generic, removable **File attachment · DEMO** chip without asking for a type; Add link accepts an HTTP(S) URL as text and displays a removable link chip. Sending includes only those labels in the temporary transcript. No files are read or uploaded, and links are never requested or opened.
- A persistent note beneath the composer explicitly says **Voice input and AI voice playback will not work in this demo.** The microphone button toggles only a visual voice-input preview; it does not request microphone access or perform speech recognition.
- Every agent response includes a **speaker icon** that briefly animates a silent AI-voice playback preview. It does not play audio or synthesize speech.
- All preview state is local to the current page. No real GRID.AI backend, speech engine, device or file integration is used.

## Continuous conversation grid

The same subtle 40px GRID background is now rendered on the **entire center pane** for both private chats and agent meetings. The message thread and composer footer are transparent so the grid lines run continuously behind the message area, composer, and bottom caption to the viewport edge. The top header and actual message/composer cards retain their existing opaque surfaces, and the meeting-specific controls are unchanged.

## Live meeting mode (Teams-inspired visual demo)

In **Session details → Conversation mode**, select **Start live meeting** on an existing private chat or shared meeting. Connect preserves the same conversation ID, original participants, user messages, scripted agent replies, meeting privacy, attachments, and transcript; it only changes the presentation. The main viewport becomes a Teams-inspired stage with an audio-only participant tile for each agent (their existing avatar/profile picture, **no agent video feed**) and a Master Control placeholder tile. Agent tiles glow green when a new scripted reply arrives or when **Preview speaking** is clicked. Audio is not produced.

The live stage offers **Hide chat / Show chat**, letting the user continue typing in the same conversation without leaving the preview. **Mic off / Camera off** are optional and default off; toggling them only changes the visible demo state and never requests microphone/camera access. **Return to chat** is available both in the Live Meeting toolbar and the Session details button, preserving messages without ending/deleting the chat. Switching conversations restores each one's own local demo mode, and refreshing resets all demo state. No WebRTC, streaming, telephony, real voice, AI inference or actual video capture is implemented.

## Optional approval and rejection comments

The demonstration action-review card in a conversation includes a **Decision comment (optional)** text area, usable for either **Approve in demo** or **Reject**. Reviewers may submit the decision with no comment. If provided, the note is retained with that demo decision, shown underneath the final status, and included in TXT/Markdown conversation exports. An unsubmitted note stays in the current in-memory conversation across message re-renders or chat switching; comments are limited to 500 characters. No real host operation takes place, and all demo history resets on page refresh.

## Live Meeting transition animation

Switching from a private chat or shared meeting into **Live Meeting** first fades and slides the entire conversation workspace out for 190 ms, changes only the view while hidden, and fades the Live Meeting layout in over 320 ms. **Return to chat** uses the same transition in reverse, without creating a new conversation or changing the transcript. The topbar and navigation remain stationary. Rapid conversation switches cancel pending mode changes; if **Animations OFF** is selected, the mode changes immediately without a fade.

## Live Meeting chat-panel animation and continuation access

**Hide chat / Show chat** now smoothly animates the conversation side panel, fading and sliding it while the participant grid expands or contracts over 380 ms. On narrow/mobile layouts, the chat panel collapses vertically rather than horizontally. The chat transcript remains the same and is not removed. Rapid toggles reverse the animation without waiting, and **Animations OFF** makes the change instant. When hidden, the chat panel is inaccessible to keyboard focus until shown again.

**Continue conversation** remains in the chat composer at the bottom when chat is visible. When the chat panel is hidden, a **Continue conversation** dropdown appears in the Live Meeting bottom toolbar, offering the existing Even G2 Glasses, Phone Call, Terminal, and Other demo-only handoff choices. No device connects or real call starts.

## Invite agents into the same Live Meeting

The topbar's **+ Invite agent** is the single invitation control in both regular chat and Live Meeting, including when MCP is not among the participants. The invite picker excludes already-present agents and enforces the six-agent maximum. Confirming an invitation **updates the current chat's participants in place** instead of creating a new chat or replacing the transcript. The same chat ID, live-mode settings, history, and draft conversation remain intact; each new agent portrait tile appears after a randomized 1.33–3 second delay alongside a join notice and scripted greeting. The new agent can then be addressed with `@AGENT` in that meeting.

When a previously private live conversation gains an agent, its display type changes to a shared meeting without changing its ID. Prior private messages remain visible to Master Control locally; the demo marks a new shared segment and does not supply earlier private messages to newly joined agents as context. This does **not** represent a real audio/video connection or real agent context sharing. Ordinary chat invitations now also preserve the same conversation; when a private chat gains its first new agent, a visible shared-segment boundary marks where collaboration begins. Earlier private history is retained locally but not provided to joining agents as context.

## Delayed agent invitations (visual demo)

Inviting an agent immediately adds **"Invitation sent to [AGENT]"** to the current chat transcript. Invited agents then join after an independent, randomly chosen **1.33–3.00 second delay**. When each arrives, a system notice reads **"[AGENT] joined the call"** for Live Meeting or **"[AGENT] joined the chat"** in a regular shared chat; then the agent sends a short scripted greeting. In Live Meeting, its profile-picture tile appears and the speaking highlight is activated for its greeting. Pending invitations are counted toward the six-agent capacity, blocked from duplicate selection, and shown in the Live Meeting participant count. Invitations still finish in their originating chat if you switch conversations, and deleted chats never receive late joins.

Live Meeting invitations remain in the **same** conversation. Ordinary chat invitations also join the **same conversation**, rather than creating a new shared meeting. When a private chat becomes shared, a new segment boundary separates earlier private history from messages the invited agents can participate in. No voice, video, network or actual agent session is initiated.

## In-place chat invitations and Live Meeting arrival animation

**Invite agent** adds participants to the *current* chat or Live Meeting instead of creating another meeting. Private-to-shared transitions keep the same chat ID and existing visible history, with an explicit shared-segment boundary so earlier private context is not supplied to new demo agents. All joins still use the independent randomized 1.33–3 second delay, appropriate joined-the-chat/joined-the-call notice, and scripted greeting.

When an invited agent joins a **Live Meeting**, only their new participant tile fades/slides/scales in and briefly displays a **JOINED** indicator while their existing speaking highlight activates for the greeting. Already-present tiles do not replay the arrival effect. The global **Animations OFF** setting disables this visual entrance. No actual devices, voice or video streams are used.

## Invitation notices and unified invite control

**+ Invite agent** in the topbar is now the only way to invite participants, in both standard chat and Live Meeting. The duplicate **Add agent** action in the Live Meeting header was removed. Confirmed invitations add a persistent **Invitation sent to [AGENT]** notice immediately to the same conversation, followed by the existing randomized join delay, arrival notice, and scripted greeting. These notices remain in the transcript even if the chat panel is hidden. All behavior is demo-only.

## Square, sortable Live Meeting tiles

The Live Meeting stage now uses **equally sized square (1:1)** participant tiles for every agent and Master Control. The layout chooses the number of columns that best fits the available space and participant count, then recalculates when the window or chat pane changes size. When vertical room is too tight, it keeps readable squares and scrolls rather than squeezing participants into narrow or stretched cells.

Tile order is customizable **per meeting**: drag a tile onto another tile, use its **‹ / ›** buttons (also usable on touchscreens), or focus either button and use **Arrow keys, Home, or End**. Existing ordering is retained as new agents join, with new participants appended at the end. The order lasts until the browser demo refreshes. No real audio, video, or external operations are involved.

## Per-agent Live Meeting menus and departure animation

Every agent tile in a Live Meeting now has a **⋯ participant menu**, offering the same actions as the top participant portraits: **Remove from meeting**, **Whisper to [agent]**, and **Move to new chat**. The menu is accessible via mouse/touch, keyboard focus, Escape, and arrow navigation. It uses the existing shared participant-action handler, so whisper privacy and moving an agent into a new private conversation remain unchanged. The Master Control/user tile has no agent-management menu. In a one-agent private conversation, the control is disabled until the chat becomes shared.

Removing or moving an agent from a Live Meeting—using either its tile menu or the top portrait menu—plays a **420 ms fade/scale/sliding exit animation** before the participant list and square tile grid reflow. The animation is skipped when **Animations OFF** is selected, and a pending exit finishes immediately if animations are turned off mid-flight. A departure remains attached to the original meeting if you switch conversations before it finishes. The demo does not connect or disconnect a real voice/video session.

## Live Meeting header, departure requests, and centered grid

In **Live Meeting**, the redundant small participant avatars at the top fade out; the square agent tiles remain the primary participant interface, each with its own **⋯** menu. Returning to regular chat restores the top avatars. For accessibility, hidden topbar participant controls cannot be tabbed into while Live Meeting is active.

The **Remove from meeting** action has been relabeled **Ask to leave** in both agent menus. The agent immediately sends the scripted message **“See you guys later!”** to the same conversation before the existing 420 ms departure animation removes its tile. The farewell stays visible in the shared transcript after departure, and the demo prevents duplicate requests for an already-departing agent. Moving an agent to a new private chat also includes the farewell. When Live Meeting chat is hidden, the farewell is shown as a temporary notification.

Live Meeting participant cells remain 1:1 squares with a tight **4 px gap**. Fixed-size flex-wrapped tiles center **each row independently**, including incomplete final rows (such as four tiles above three), instead of stretching apart or aligning a short row to the left. Sizing still adapts to available space, participant count, sidebar visibility, and sorting preferences.

## Live Meeting system notifications and approval attention

System notices in the transcript and temporary popup notifications now include the heading **Grid.AI System Notification**. If **Live Meeting chat is hidden** when a system notice is added or a toast is displayed, a **!** badge appears next to **Show chat** and stays there until the chat panel is opened. Repeated notifications reuse the same badge; opening chat clears it. This works for invite, join, departure and other demo notifications without creating a new chat.

A **new pending approval request** automatically reveals the Live Meeting chat panel if it was hidden, using the existing Show chat fade/slide animation. The approval request and optional approve/reject comments are then accessible in the original conversation. A pending approval only triggers this reveal when first received; manually hiding the chat afterward does not repeatedly force it open until a new request arrives. With **Animations OFF**, the panel opens immediately. No real agent or host approval is performed.

## Optional UI sound effects (no background music)

GRID.AI Connect has **short, original, synthesized event sounds** via the browser's Web Audio API. Cues cover invitations, agent joins and departures, sending and receiving messages, system notices while Live Meeting chat is hidden, new approval requests, approval/rejection decisions, entering/exiting Live Meeting, and a very subtle chat-panel toggle click. Effects are brief, non-looping, and mixed at low volume; there is **no background music, speech synthesis, microphone access, streamed audio, or external audio file**.

The topbar offers **♫ Sounds ON / ♪ Sounds OFF**, available in both regular chats and Live Meeting. Effects are enabled by default but remain silent until the browser has received a genuine pointer or keyboard gesture and has allowed an AudioContext to run. Muting immediately fades the audio to silence. Unsupported/restricted browsers degrade gracefully, and the demo setting resets on refresh. Notifications intentionally do not double-play over recent join/leave/approval cues.

## Preparing free subdomain hosting

The repository root opens the **GRID.AI home dashboard**, with links to Connect and Workflow Designer. Direct page URLs remain supported. It can be deployed independently from the main portfolio as a static Vercel project linked to this public GitHub repository. The proposed custom hostname is `gridai-demo.jacklondon.site`. This repository does **not** contain DNS configuration; the subdomain must be assigned to the hosting project and verified with the DNS provider separately. Opening the project on Vercel should not alter the main `jacklondon.site` project's routing.

## Agentic Workflow Designer (standalone UI prototype)

- Open `Workflow-Designer.html` directly. The page loads `styles/workflow-designer.css` and `scripts/workflow-designer.js` independently from Connect, with a Home return link.
- The responsive workspace pairs **Design with MCP**, a scripted planning conversation, with a **Workflow Blueprint** canvas that displays ordered trigger, processing, approval, and output nodes.
- Four quick-start prompts generate example plans for engineering briefings, pull request reviews, file organization, and resource monitoring. Other prompts create a generic customizable plan. The browser-side responses use keyword matching, **not a live AI model**.
- A few conversational refinements are supported as a demo: add/remove approval, change schedule, assign a specialist, rename a flow, or update the delivery step.
- Select a generated node to edit its title, instructions, and assigned agent; insert, reorder, or remove processing steps. **Preview run** animates the nodes without executing anything.
- **Export JSON** downloads a clearly labeled non-executable blueprint. **New draft** resets the canvas. Designs and conversation state are kept in memory and reset on refresh. No integrations, scheduler, runtime, AI inference, host operations, or real notifications are connected.

## Workflow library (browser-only)

The Workflow Designer now has an **Active Workflows** preview list and a **Saved Blueprints** library in the sidebar. **Save workflow** stores a draft locally using browser `localStorage`, with Open, Activate/Pause preview, and Delete controls. Editing a loaded design requires **Save changes** to update the saved copy. Saving and preview activation **never run an agent, register a job, or schedule a task**; the active status is purely cosmetic. The workflow library persists across refreshes in the same browser (unless local storage is unavailable, private browsing clears it, or the user deletes site data). Chat transcripts remain ephemeral.

The MCP conversation and workflow canvas panels stretch to a consistent height on desktop, replacing the old viewport-based cap on the chat panel. The operator sidebar remains visible during long blueprints and scrolls its saved-workflow lists separately. Preview deployments are disabled in Vercel; these source changes do not require a preview deployment.

## Step-specific custom skill attachments

Each selected Workflow Designer step now has a **Custom Step Skill** panel that accepts a plain-text `.txt` or Markdown `.md` file (up to **64 KB**) containing its instructions. The selected step displays an attachment indicator, filename, removal control, and expandable read-only preview. Skill text is read locally and attached **only to that step**. Save workflow persists it in the existing browser-local blueprint library, and Export JSON includes the skill filename, size, and content. Files are never uploaded, executed, or sent to MCP; this is a design-only prototype.

The Workflow Designer's desktop layout now uses the full available viewport instead of making the page scroll. The intro and workflow summary are compact, and overflow scrolls inside the blueprint canvas, MCP transcript, step editor, and sidebar. Smaller stacked/mobile layouts still use natural scrolling so content is reachable. The decorative sidebar promo was removed.

## Sidebar search, folders, sorting, and status

The Workflow Designer sidebar now has a live search field covering saved and active workflow titles, descriptions, triggers, step names, agents, skill filenames, and folder names. Saved blueprints can be organized into up to 12 named folders; create, filter, rename, and remove folders or move individual workflows using each card's folder picker. Deleting a folder puts its blueprints into Unfiled without deleting them. Sort by most recently updated, oldest, name, or folder. Existing saved designs automatically remain Unfiled and are retained across this update. Folder and view preferences persist in the same browser using localStorage.

Workflow cards preserve distinct **Saved Design**, **Active Preview**, and **Paused Preview** states. The Activate/Pause/Resume button updates the matching workflow's saved state, moves it to the appropriate list, and updates the active counts. The workspace-status control defaults to **Working with User** in the MCP-led Workflow Designer and can independently be set to **Designing**, **Reviewing**, or **On hold** by the user. These are all browser-local UI states and do not schedule, run, or stop a real GRID.AI workflow.


## GRID.AI Home dashboard

- The responsive gold-and-obsidian dashboard uses the existing Connect palette through `styles/grid-theme.css`. Connect and Workflow Designer load the shared tokens before their existing styles so their established appearance is preserved; existing page-specific tokens are not yet consolidated.
- Launch Connect or Workflow Designer from the sidebar or application cards. Command Center, Project Manager, Agent Directory and Settings open clearly labeled concept dialogs until implemented. System Monitor and Integrations open the respective inline Home demo panels. Both existing applications have explicit Home return links.
- Individual agent rows open a new private Connect conversation. The Home Mcp Direct Access bar and its shortcut have been removed.
- All dashboard metrics, connections, tasks, and approval examples are simulated and are not synchronized with Connect or saved workflow state. Home approval decisions support an optional comment, update the Home counts and reset on refresh; completed cards use struck-through titles and subdued contents with full-opacity borders. No real operation is authorized. The agent list expands to all six agents; existing portraits are reused, and VOLT and RELAY use initials. Each agent independently cycles between Available and Working in background with role-specific example tasks, and the overview counts follow the demo state.
- The sidebar collapses at narrower widths and panels reflow for mobile. The dashboard requires no backend, external assets, packages or build step. Preview deployments remain governed by the existing Vercel settings; `.vercelignore` is unchanged.

- System Resources expands in place to four labeled demo utilization graphs (CPU, RAM, GPU, VRAM) with synthetic rolling 60-second histories and two-second sample updates. Summary bars match the newest sample. No actual telemetry is read.
- Connected Systems expands in place to view individual example systems and add or delete inventory entries with a confirmation step. The demo inventory persists in browser localStorage where supported. No real host, device, service or account is connected or disconnected.

- Home uses staggered entrance animations and a short fade-out before launching Connect or Workflow Designer in the same tab. Expansion/collapse animates the agent list, resource charts, connected systems manager, system details and notification panel. Reduced-motion preferences disable these effects. The Attention Required panel stretches to match Agent Activity on desktop.
- The notification bell opens a real demo notification feed with unread counts, mark-all-as-read, approval links, and system inventory change events. Reading notifications does not resolve approvals. Notification state is page-local and resets on reload.
- Background-working agents use the gold busy color on Home, with randomly chosen role-specific example tasks and detail counts. These are simulated; other applications retain their own presence styling.

- Home's desktop sidebar is a 64px icon rail that expands to 244px on hover or keyboard focus, then contracts when the pointer and keyboard focus leave. The expanded sidebar overlays the dashboard rather than shifting its layout. Touch and narrow screens retain click-to-open navigation. This change is scoped to Home; Connect and Workflow Designer retain their current sidebars. Reduced-motion settings disable the width transition.

## Unified GRID.AI application shell

The root `index.html` now hosts Home, Connect and Workflow Designer as native, persistent workspaces. The global hover navigation and notification center remain mounted while workspace content fades out and in. Routes use hash URLs and browser history; planned applications have placeholder workspaces, while Integrations and System Monitor reveal their Home panels. Connect and Workflow Designer initialize lazily inside native shadow roots (no iframes), keeping existing CSS, duplicate IDs, event handlers and demo state isolated. Chats, live meeting state and unsaved blueprints are retained across workspace switches until a full reload. The notification center also receives Connect and Workflow Designer demo toasts and can reopen the originating Connect chat. Home reflects active Connect presence on its next simulated agent update; idle agents continue simulated work cycles. Existing standalone URLs redirect to the corresponding workspace, with `?standalone=1` available for standalone development. After editing original Connect or Workflow Designer HTML, CSS or JS, run `node tools/build-embedded.cjs` and commit the regenerated `scripts/embedded-*.js` files. The generated adapters are checked in so no build is required to run the demo. All data remains simulated. Home and Connect approvals are still separate examples; global notices can lead to their respective application. Shared sound and animation preferences across applications are not yet consolidated.

## Unified workspace corrections

Connect's embedded startup now waits until the agent UI's lexical state has been initialized, correcting a temporal-dead-zone failure introduced by concatenation. The original Connect brand and operator footer are restored in the embedded workspace. Workflow Designer removes the large introduction/status banner and places the existing status control in its compact toolbar, freeing room for the blueprint and chat. Dedicated System Monitor and Integrations routes display “Yet to be added.” The existing Home resource and system-inventory demo panels remain available on Home.

- Compact workspace chrome: the Connect conversation heading is visually hidden while its accessible text and meeting controls remain, Workflow Designer's duplicate breadcrumb/status toolbar block is removed, and the global header is shortened. Mcp's read-only presence appears by the portrait (Working with User; gold while drafting). Workflow Designer uses the existing Connect synthesized sent/received/error cues and its own sound toggle; browser audio still requires a real interaction. Both embedded adapters are regenerated after these source changes.

- Workflow Designer simulates Mcp drafting with randomized analysis/planning delays, step-by-step blueprint reveal, a progress card, stage-specific portrait status, and final review. Cancel drafting restores the previous blueprint; saving, exporting, editing and opening other blueprints are blocked during the draft. This is still a deterministic UI simulation, not real AI reasoning or execution.

- Connect now uses `scripts/demo-text.js`, a deterministic, browser-local intent and topic matcher. It recognizes greetings, thanks, identity, status, approvals, debugging, reviews, planning and task requests; routes undirected meeting requests by specialist topic and honors explicit @mentions. Responses vary by role and recent scoped transcript. Each invited agent receives a new history boundary, and whisper replies use only their own thread. No external model, host access or durable memory is used. Regenerate the Connect adapter after editing the matcher.

- Connect removes its redundant GRID.AI Connect logo block. Workflow Designer removes its separate top toolbar and places New draft, Save workflow, and Export JSON in the Visual Designer panel header. Button IDs, event handlers and draft-lock behavior are unchanged; controls wrap as space requires.

- Connect no longer displays the duplicate Master Control identity footer. The global top-right MC avatar is replaced with a gear shortcut to the Settings workspace; the global sidebar operator identity remains intact. Settings is still a planned workspace.

- Global navigation includes File Manager, Skills Manager, Model Manager, Voice Studio and Terminal as “Yet to be added” placeholder workspaces, grouped under Workspace, Agent Management and System. The future city workspace (The Grid) is intentionally excluded. Each new tab has its own hash route and participates in existing navigation transitions and browser history.

## Central Settings

Settings owns browser-local sound enable/volume, Connect typewriter responses, animations (including OS reduced-motion), desktop sidebar pinning and notification badge visibility. Original Web Audio cues are initialized once by the shell. Local controls are hidden in embedded apps; standalone development pages retain their fallback controls. Preferences apply to mounted workspaces and future mounts. Reset affects preferences only. Configuration links lead to existing dedicated workspaces; backend policies, models, voices and integrations are not fabricated.

- New global notifications trigger an original three-tone alert (subject to audio permission, master volume, notification-sound setting and existing anti-overlap rules) and a Windows-style bottom-right in-app banner. Up to three banners stack; each expires after 6.5 seconds, pauses on hover/focus, can be dismissed without marking read, or opens its corresponding workspace/approval/notification center when clicked. Notifications remain in the feed. Settings adds separate sound/banner switches and a test notification. Embedded apps use the global banner instead of duplicate local toasts. Initial seeded notifications stay silent. These are browser UI banners, not operating-system notifications.

- `GridPresence` is the shared session-local simulated agent presence registry. Home background activity supplies a baseline; Connect publishes selected conversation, live meeting and pending reply activity; Workflow Designer publishes Mcp's actual simulated drafting stages. The active route resolves user-facing activity; leaving a workspace releases idle user presence, but unfinished replies, live meetings and drafting continue. Active drafting takes precedence for Mcp. Every mounted workspace subscribes to the same status, updating only presence indicators. Future workspaces can consume `GridPresence.snapshot()`, `get(agent)` and `subscribe`. No private message content or real host telemetry is shared.
