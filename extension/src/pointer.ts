// The context-menu API does not expose pointer coordinates. Capture only right-clicks.
document.addEventListener('contextmenu', event => {
  const display = screen as Screen & { availLeft?: number; availTop?: number }
  void chrome.runtime.sendMessage({
    type: 'context-position',
    x: event.screenX, y: event.screenY,
    left: display.availLeft ?? 0, top: display.availTop ?? 0,
    width: screen.availWidth, height: screen.availHeight,
    time: Date.now(),
  }).catch(() => { /* Extension was reloaded; refreshing the page reconnects it. */ })
}, true)
