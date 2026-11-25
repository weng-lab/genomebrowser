# Agent chat, preferences, and control

Agent chat lets a signed-in user ask the integrated agent in the browser's `AI Assist` panel to work on the open session, stop it, and start a clean conversation. The agent can hold control of the browser during a workflow of several steps, and the user can give it standing preferences in Settings.

## Sub-features

- `chat-send` sends a message from `Message the agent` with `Send` (or Enter), shows it under `You` in the `Agent conversation` log, and shows the agent's reply and tool steps under `Agent`.
- `chat-stop` shows `Stop` and `Working…` while a run is in progress; `Stop` ends the run and keeps changes already applied.
- `chat-thread` keeps one conversation per session: it reappears after a reload, and `New conversation` (shown only when no run is in progress) starts it clean.
- `chat-switch-warning` asks `Your agent is still working. Switching sessions will stop it.` before opening another session during a run.
- `control-lock` dims the browser and shows `The agent has control of the browser while it works.` with `Stop` while the agent holds control; an external MCP client's hold shows `Take back control` instead.
- `agent-preferences` saves the `Preferences` text under `Agent preferences` in `/settings` (up to 1,000 characters, with `Save` and `Discard`).

## How to get to it (user POV)

- On `/browser/<id>`, open the `AI Assist` right panel (open by default; toggle with `Ctrl+Alt+B`). The message box is enabled once the panel reads `Connected.`.
- Click `Settings` in the navigation rail (or visit `/settings`) and find `Agent preferences`.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is healthy (`verify-web.mjs doctor` passes with `mode: "signed-in"`) and reports `redis` `ok: true`. Without Redis the panel never connects; report the chat as blocked by Redis.
- The agent has model access: `AI_GATEWAY_API_KEY` or a provider key in `apps/web/.env.local`. Without it, a sent message ends in an error alert; report the chat as blocked by model access rather than as a product failure.
- A session is open at `/browser/<id>`, Remote Control is on, and `AI Assist` reads `Connected. MCP tools called with sessionId "<id>" run in this tab.`.

- **Send a message.** Fill `Message the agent` (`verify-web.mjs browser find label "Message the agent" fill "Go to chr12:53385000-53400000"`), click `Send`, and wait for `Working…` to disappear. The `Agent conversation` log shows the message under `You`, a tool step, and a reply under `Agent`, and the browser toolbar shows the new `chr12` region.
- **Stop a run.** Send a request of several steps, click `Stop` while `Working…` shows, and confirm the run ends, the input re-enables, and changes made before Stop remain.
- **Keep the thread.** Reload (`verify-web.mjs browser reload`) and confirm the earlier messages reappear. Click `New conversation` and confirm the log is empty.
- **Save preferences.** On `/settings`, fill `Preferences`, click `Save`, wait for `Saved`, reload, and confirm the text remains. Clear it and save again to restore the default.
- **Proof.** Record a short video of a send and its reply (`verify-web.mjs record start agent-chat/send` … `record stop`), and screenshot the dimmed browser with its control banner if the agent took control.

## Gotchas

- Each message calls the real model and costs tokens. Keep verification prompts short and few.
- Agent preferences belong to the account, not the session. Restore them to empty after verification.
- `New conversation` permanently ends the session's thread; messages before it are gone.
- While the agent holds control, the browser and its toolbar are inert, so clicks there do nothing. Use the banner's `Stop` or wait for the run to end.
