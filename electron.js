import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getIndexPath() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5173';
  } else {
    return `file://${path.join(__dirname, 'dist', 'index.html')}`;
  }
}

function createWindow() {
  const bottomOffset = 300;

  const win = new BrowserWindow({
    width: 1, // اندازه اولیه مهم نیست
    height: 1,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false, // <<<< مهم: پنجره همیشه مخفی شروع به کار می‌کنه
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const indexPath = getIndexPath();
  win.loadURL(indexPath);

  // --- بلاک کد مشکل‌ساز حذف شد ---
  // win.once('ready-to-show', ...)  کاملاً حذف شده است

  // --- تنها منطق برای نمایش و تغییر اندازه ---
  ipcMain.on('resize-app', (event, { width, height }) => {
    if (win && !win.isDestroyed()) {
      const display = screen.getPrimaryDisplay();
      const { height: screenHeight } = display.workAreaSize;
      const xPos = 100;
      const yPos = screenHeight - height - bottomOffset;

      win.setBounds({ x: xPos, y: yPos, width, height });

      // فقط زمانی که اندازه درست رو گرفتیم، پنجره رو نشون می‌دیم
      if (!win.isVisible()) {
        win.show();
      }
    }
  });

  // --- مدیریت بستن برنامه ---
  ipcMain.on('close-widget', () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});