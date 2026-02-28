{pkgs, ...}: {
  idx.workspace.onStart = {
    # This runs every time the workspace starts/re-starts
    start-server = "node server.js 9002";
  };
}