let registration;
let waiting;
let reloadOnChange = false;
export let offlineReady = false;
export let appVersion = '';

export async function setupPwa(onStatus, canUpdate, notify) {
  try {
    const release = await (await fetch(new URL('./version.json', import.meta.url))).json();
    appVersion = release.release ? `v${release.release}` : release.version;
    if (!('serviceWorker' in navigator)) return onStatus();
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnChange) location.reload();
      else { offlineReady = true; onStatus(); }
    });
    registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});
    const showUpdate = () => {
      waiting = registration.waiting;
      if (!waiting) return;
      const banner = document.querySelector('#update');
      banner.hidden = false;
      banner.innerHTML = '<span>新版本已准备好，学习记录会保留</span><button type="button">更新</button>';
      banner.querySelector('button').onclick = () => {
        if (!canUpdate()) return notify('考试正在进行，请交卷后再更新');
        reloadOnChange = true;
        waiting.postMessage({type: 'ACTIVATE_UPDATE'});
      };
    };
    showUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          if (navigator.serviceWorker.controller) showUpdate();
          else { offlineReady = true; onStatus(); }
        }
      });
    });
    navigator.serviceWorker.ready.then(() => {offlineReady = true; onStatus();});
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) registration.update().catch(() => {});
    });
    onStatus();
  } catch { notify('离线缓存尚未准备好，请联网后重试'); onStatus(); }
}

export async function checkUpdate(notify) {
  if (!navigator.onLine) return notify('当前离线，请联网后检查更新');
  if (!registration) return notify('离线服务尚未就绪，请稍后重试');
  try {
    await registration.update();
    notify(registration.waiting ? '新版本已准备好，请点击上方更新' : '已检查更新，新版本下载完成后会提示');
  } catch { notify('检查更新失败，请稍后重试'); }
}
