import electron from 'electron'
const { ipcRenderer, contextBridge } = electron

contextBridge.exposeInMainWorld('electron', {
    saveMap: (content: string) => ipcRenderer.invoke('save-map', content),
    saveMapToPath: (path: string, content: string) => ipcRenderer.invoke('save-map-to-path', path, content),
    loadMap: () => ipcRenderer.invoke('load-map'),
    loadMapFromPath: (path: string) => ipcRenderer.invoke('load-map-from-path', path),
    getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
    pickFile: () => ipcRenderer.invoke('pick-file'),
    pickImage: () => ipcRenderer.invoke('pick-image'),
    readImageBase64: (path: string) => ipcRenderer.invoke('read-image-base64', path),
    openFile: (path: string) => ipcRenderer.invoke('open-file', path),
})
