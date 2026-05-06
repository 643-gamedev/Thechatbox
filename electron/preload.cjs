const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('thechatboxDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});
