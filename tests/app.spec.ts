import { expect, test } from "@playwright/test";

test("frontend can list and create workspaces through the backend API", async ({ page }) => {
  const initialListWorkspacesResponse = page.waitForResponse((response) =>
    response.url().includes("/synthify.tree.v1.WorkspaceService/ListWorkspaces") && response.ok()
  );
  await page.goto("/");
  await initialListWorkspacesResponse;

  await expect(page.getByTestId("workspace-count")).toHaveText("count:0");
  await page.getByPlaceholder("workspace name").fill("E2E Workspace");

  const createWorkspaceResponse = page.waitForResponse((response) =>
    response.url().includes("/synthify.tree.v1.WorkspaceService/CreateWorkspace") && response.ok()
  );
  await page.getByRole("button", { name: "create workspace" }).click();
  await createWorkspaceResponse;

  await expect(page.getByText("E2E Workspace", { exact: true })).toBeVisible();
  await expect(page.getByTestId("workspace-count")).toHaveText("count:1");

  const reloadedListWorkspacesResponse = page.waitForResponse((response) =>
    response.url().includes("/synthify.tree.v1.WorkspaceService/ListWorkspaces") && response.ok()
  );
  await page.reload();
  await reloadedListWorkspacesResponse;
  await expect(page.getByText("E2E Workspace", { exact: true })).toBeVisible();
  await expect(page.getByTestId("workspace-count")).toHaveText("count:1");
});
