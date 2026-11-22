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

Live Meeting participant cells remain 1:1 squares, now with a tight **4 px gap** and **fixed-width grid tracks centered as a group** rather than stretching apart across the stage. Sizing still adapts to available space, participant count, sidebar visibility, and sorting preferences.

## Live Meeting system notifications and approval attention

System notices in the transcript and temporary popup notifications now include the heading **Grid.AI System Notification**. If **Live Meeting chat is hidden** when a system notice is added or a toast is displayed, a **!** badge appears next to **Show chat** and stays there until the chat panel is opened. Repeated notifications reuse the same badge; opening chat clears it. This works for invite, join, departure and other demo notifications without creating a new chat.

A **new pending approval request** automatically reveals the Live Meeting chat panel if it was hidden, using the existing Show chat fade/slide animation. The approval request and optional approve/reject comments are then accessible in the original conversation. A pending approval only triggers this reveal when first received; manually hiding the chat afterward does not repeatedly force it open until a new request arrives. With **Animations OFF**, the panel opens immediately. No real agent or host approval is performed.

## Optional UI sound effects (no background music)

GRID.AI Connect has **short, original, synthesized event sounds** via the browser's Web Audio API. Cues cover invitations, agent joins and departures, sending and receiving messages, system notices while Live Meeting chat is hidden, new approval requests, approval/rejection decisions, entering/exiting Live Meeting, and a very subtle chat-panel toggle click. Effects are brief, non-looping, and mixed at low volume; there is **no background music, speech synthesis, microphone access, streamed audio, or external audio file**.

The topbar offers **♫ Sounds ON / ♪ Sounds OFF**, available in both regular chats and Live Meeting. Effects are enabled by default but remain silent until the browser has received a genuine pointer or keyboard gesture and has allowed an AudioContext to run. Muting immediately fades the audio to silence. Unsupported/restricted browsers degrade gracefully, and the demo setting resets on refresh. Notifications intentionally do not double-play over recent join/leave/approval cues.
