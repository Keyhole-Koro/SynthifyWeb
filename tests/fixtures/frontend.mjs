import { createServer } from 'node:http';

const port = 4173;
const apiBaseUrl = 'http://127.0.0.1:18080';
const e2eUserId = 'e2e-user';
const e2eUserEmail = 'e2e@example.com';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>API Smoke</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 24px;
      }
      main {
        display: grid;
        gap: 16px;
        max-width: 480px;
      }
      label {
        display: grid;
        gap: 8px;
      }
      ul {
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>API Smoke</h1>
      <p data-testid="workspace-count">count:0</p>
      <label>
        <span>workspace name</span>
        <input id="workspace-name" placeholder="workspace name" />
      </label>
      <button id="create-workspace" type="button">create workspace</button>
      <p id="error" role="alert" hidden></p>
      <ul id="workspace-list"></ul>
    </main>
    <script type="module">
      const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};
      const headers = {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        'X-E2E-User-Id': ${JSON.stringify(e2eUserId)},
        'X-E2E-User-Email': ${JSON.stringify(e2eUserEmail)},
      };

      const countEl = document.querySelector('[data-testid="workspace-count"]');
      const listEl = document.querySelector('#workspace-list');
      const errorEl = document.querySelector('#error');
      const inputEl = document.querySelector('#workspace-name');
      const buttonEl = document.querySelector('#create-workspace');

      function render(workspaces) {
        countEl.textContent = 'count:' + workspaces.length;
        listEl.replaceChildren(
          ...workspaces.map((workspace) => {
            const item = document.createElement('li');
            item.textContent = workspace.name;
            return item;
          })
        );
      }

      function setError(message) {
        if (!message) {
          errorEl.hidden = true;
          errorEl.textContent = '';
          return;
        }
        errorEl.hidden = false;
        errorEl.textContent = message;
      }

      async function call(method, body) {
        const response = await fetch(apiBaseUrl + '/synthify.tree.v1.WorkspaceService/' + method, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || response.statusText);
        }
        return payload;
      }

      async function loadWorkspaces() {
        const payload = await call('ListWorkspaces', {});
        render(payload.workspaces || []);
      }

      buttonEl.addEventListener('click', async () => {
        const name = inputEl.value.trim();
        if (!name) {
          return;
        }

        buttonEl.disabled = true;
        setError('');
        try {
          const payload = await call('CreateWorkspace', { name });
          const item = document.createElement('li');
          item.textContent = payload.workspace.name;
          listEl.appendChild(item);
          countEl.textContent = 'count:' + listEl.children.length;
          inputEl.value = '';
        } catch (error) {
          setError(error instanceof Error ? error.message : String(error));
        } finally {
          buttonEl.disabled = false;
        }
      });

      loadWorkspaces().catch((error) => {
        setError(error instanceof Error ? error.message : String(error));
      });
    </script>
  </body>
</html>`;

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('missing url');
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E frontend fixture listening on http://127.0.0.1:${port}`);
});
