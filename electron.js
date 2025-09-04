const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

function getIndexPath() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5173';
  } else {
    return path.join(app.getAppPath(), 'index.html');
  }
}

function createWindow() {
  const winWidth = 800;
  const winHeight = 820;
  const bottomOffset = 300; // فاصله از پایین

  const display = screen.getPrimaryDisplay();
  const { height: screenHeight } = display.workAreaSize;
  const xPos = 100;
  const yPos = screenHeight - winHeight - bottomOffset;

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: 100,
    y: 100, // موقت، بعداً اصلاح می‌کنیم
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: path.join(__dirname, 'ایکون', 'Picon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const indexPath = getIndexPath();
  if (indexPath.startsWith('http')) {
    win.loadURL(indexPath);
  } else {
    win.loadFile(indexPath);
  }

  // بعد از آماده شدن پنجره، موقعیت نهایی را تنظیم کن
  win.once('ready-to-show', () => {
    win.setBounds({ x: xPos, y: yPos, width: winWidth, height: winHeight });
  });

  // Drag پنجره
  ipcMain.removeAllListeners('window-drag');
  ipcMain.on('window-drag', (event, deltaX, deltaY) => {
    const bounds = win.getBounds();
    win.setBounds({
      x: bounds.x + deltaX,
      y: bounds.y + deltaY,
      width: bounds.width,
      height: bounds.height,
    });
  });

  // بستن ویجت و کل برنامه
  ipcMain.removeAllListeners('close-widget');
  ipcMain.on('close-widget', () => {
    BrowserWindow.getAllWindows().forEach(w => w.destroy());
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

