import electron from 'electron'
const { app, BrowserWindow, ipcMain, dialog, shell } = electron
import path from 'path'
import fs from 'fs/promises'
// const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In CJS, __dirname is globally available


process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

if (!process.env.VITE_PUBLIC) process.env.VITE_PUBLIC = '';
if (!process.env.DIST) process.env.DIST = '';

let win: any // BrowserWindow

const createWindow = () => {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        width: 1200,
        height: 800,
        autoHideMenuBar: true, // Clean look
    })

    // Retry loading URL to handle race condition where Vite isn't ready
    const loadURLWithRetry = (url: string, retries = 50) => {
        win?.loadURL(url).catch((err: unknown) => {
            console.log(`Load failed, retrying... (${retries} left)`);
            if (retries > 0) {
                setTimeout(() => loadURLWithRetry(url, retries - 1), 500);
            } else {
                console.error("Failed to load app after many retries:", err);
            }
        });
    };

    if (app.isPackaged) {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'));
    } else {
        loadURLWithRetry('http://localhost:5173');
    }

    // Open DevTools immediately to help diagnose
    // win.webContents.openDevTools();
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    createWindow()

    // IPC Handlers
    // --- Persistence Helper for Recent Files ---
    const RECENT_FILES_PATH = path.join(app.getPath('userData'), 'recent_files.json');

    const getRecentFiles = async () => {
        try {
            const data = await fs.readFile(RECENT_FILES_PATH, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    };

    const addToRecents = async (filePath: string) => {
        try {
            let recents: string[] = await getRecentFiles();
            // Remove if exists to push to top
            recents = recents.filter(p => p !== filePath);
            recents.unshift(filePath);
            // Limit to 10
            recents = recents.slice(0, 10);
            await fs.writeFile(RECENT_FILES_PATH, JSON.stringify(recents), 'utf-8');
        } catch (e) {
            console.error("Error updating recents:", e);
        }
    };

    // IPC Handlers

    // Get Recents
    ipcMain.handle('get-recent-files', async () => {
        return await getRecentFiles();
    });

    // Save Map with Dialog (Save As)
    ipcMain.handle('save-map', async (_, content: string) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Guardar Mapa Mental',
                defaultPath: 'mapa-mental.json',
                filters: [{ name: 'Paper Map JSON', extensions: ['json'] }]
            })

            if (filePath) {
                await fs.writeFile(filePath, content, 'utf-8')
                await addToRecents(filePath);
                return filePath; // Return the path so frontend knows it
            }
            return null
        } catch (e) {
            console.error('Error saving:', e);
            return null;
        }
    })

    // Save Map to specific path (Save)
    ipcMain.handle('save-map-to-path', async (_, filePath: string, content: string) => {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            await addToRecents(filePath);
            return true;
        } catch (e) {
            console.error('Error saving to path:', e);
            return false;
        }
    });

    ipcMain.handle('load-map', async () => {
        try {
            const { filePaths } = await dialog.showOpenDialog({
                title: 'Cargar Mapa Mental',
                properties: ['openFile'],
                filters: [{ name: 'Paper Map JSON', extensions: ['json'] }]
            })
            if (filePaths.length > 0) {
                const content = await fs.readFile(filePaths[0], 'utf-8')
                await addToRecents(filePaths[0]);
                return { content, filePath: filePaths[0] } // Return content AND path
            }
            return null
        } catch (e) {
            console.error('Error loading:', e);
            return null;
        }
    })

    // Load from specific path (for Recents click)
    ipcMain.handle('load-map-from-path', async (_, filePath: string) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            await addToRecents(filePath); // Bump to top
            return content;
        } catch (e) {
            console.error("Error loading path:", e);
            return null;
        }
    });

    ipcMain.handle('pick-file', async () => {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'All Files', extensions: ['*'] }
            ]
        })
        return filePaths[0] || null
    })

    // Pick Image specific
    ipcMain.handle('pick-image', async () => {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
            ]
        })
        return filePaths[0] || null
    })

    // Read file as base64 for images
    ipcMain.handle('read-image-base64', async (_, filePath: string) => {
        try {
            const bitmap = await fs.readFile(filePath);
            const ext = path.extname(filePath).slice(1); // remove dot
            return `data:image/${ext};base64,${bitmap.toString('base64')}`;
        } catch (e) {
            console.error('Error reading image:', e);
            return null;
        }
    })

    ipcMain.handle('open-file', async (_, targetPath: string) => {
        try {
            // Try string as URL first if it starts with http
            if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
                await shell.openExternal(targetPath);
            } else {
                // Normalize path for Windows
                await shell.openPath(path.normalize(targetPath));
            }
        } catch (e) {
            console.error('Error opening file:', e);
        }
    })
})
