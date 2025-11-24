export const printLabel = (product: any) => {
   
  window.electron.ipcRenderer.send("print-label", product);
};
