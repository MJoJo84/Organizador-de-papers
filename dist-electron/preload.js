"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const { ipcRenderer, contextBridge } = electron_1.default;
contextBridge.exposeInMainWorld('electron', {
    saveMap: (content) => ipcRenderer.invoke('save-map', content),
    saveMapToPath: (path, content) => ipcRenderer.invoke('save-map-to-path', path, content),
    loadMap: () => ipcRenderer.invoke('load-map'),
    loadMapFromPath: (path) => ipcRenderer.invoke('load-map-from-path', path),
    getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
    pickFile: () => ipcRenderer.invoke('pick-file'),
    pickImage: () => ipcRenderer.invoke('pick-image'),
    readImageBase64: (path) => ipcRenderer.invoke('read-image-base64', path),
    openFile: (path) => ipcRenderer.invoke('open-file', path),
});
