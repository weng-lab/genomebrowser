# Delivery plan

Both versions need to be usable by January. Develop shared features through local `gb`, and test a small cloud deployment early. Cloud is the priority product, so its integration work should not wait until every local feature is finished.

These milestones describe the proposed build order. They are not an estimate or a report of completed work.

## 1. Shared workspace and one working tool

Render the same workspace from the local and cloud entry points. Connect an external MCP client to the local server and route a command into the browser tab.

Done when an agent can read the browser state, move to a region, and receive the result. The UI controls must still work without an agent. Both builds should show the same browser interface.

## 2. Early cloud deployment

Start this alongside the shared app work. Deploy the website and API server, connect Clerk, and add the first cloud persistence path. Exercise an Eve conversation that calls a browser tool through MCP.

Done when a guest can browse a curated collection, a signed-in user can save and reopen a session, and Eve can operate that user's open browser. Verify session access checks and the tab connection on the deployed services.

This is the point to find hosting, authentication, and agent integration problems. Keep the deployment small while those paths are being tested.

## 3. Complete the local workflows

Add the remaining basic store-backed tools, local session persistence, collection JSON loading, file serving, and ACP chat. Agree on collection persistence before finalizing how imported collections survive a restart.

Done when a user can start `gb` in a project, expose a data folder, load tracks, and reopen their saved browser state after restarting. Check both an external MCP client and an ACP agent in the chat panel. Repeat the file-loading workflow with `gb` on a lab server reached through SSH.

## 4. Complete the cloud experience

Finish the curated collection workflow, account UI, session management, and Eve chat using the shared components. Apply guest and account usage limits on the server. Confirm with the PIs whether any custom collection import belongs in this release.

Done when someone can try the site without an account and understand that their session is temporary. After signing in, they can save and reopen work and use Eve within the account allowance. Decide whether signing in preserves the guest's current view before finalizing that flow.

## 5. Release checks

Test the complete user workflows in both builds, including failures:

- An agent gets a useful error when the browser tab disconnects.
- A failed save is visible to the user. If conflicting-tab protection is included, test it with two tabs saving different state.
- Missing or unreadable local files produce an explanation without discarding the rest of the session.
- Guest sessions do not persist, and Eve limits cannot be bypassed just by hiding or changing UI controls.
- Users cannot access another user's saved sessions or control their browser.
- A UI or browser tool change behaves consistently in both builds.

Keep setup instructions short: start `gb`, expose data, connect an agent, and use SSH forwarding when needed. Ask lab users to try the cloud site before release, especially people who do not normally work with command-line tools.

Use the repository's normal verification checks for implementation work. The [open decisions](open-decisions.md) page identifies the questions that need answers before their corresponding workflows are finished.

[Back to release scope](README.md)
