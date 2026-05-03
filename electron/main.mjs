import { app, BrowserWindow, shell, session } from "electron";

const TWINLINE_URL = process.env.TWINLINE_URL || "https://twinline.vercel.app";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1220,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "Twinline",
    backgroundColor: "#071216",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(TWINLINE_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(TWINLINE_URL)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("app.twinline.desktop");

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowedPermissions = new Set(["media", "notifications"]);
      callback(allowedPermissions.has(permission));
    },
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
