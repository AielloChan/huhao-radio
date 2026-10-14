const controls = 'button,a.primary,a.secondary,.mode-card,.resource-link,.nav-link,.bottom-nav a,.brand';

function setupPressFeedback() {
  let press = null;
  function release() {
    press?.element.removeAttribute('data-pressed');
    press = null;
  }
  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    release();
    const element = event.target.closest?.(controls);
    if (!element || element.matches(':disabled,[aria-disabled="true"]')) return;
    press = {element,id:event.pointerId,x:event.clientX,y:event.clientY};
    element.setAttribute('data-pressed','');
  }, {passive:true});
  document.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX-press.x,event.clientY-press.y) > 10) release();
  }, {passive:true});
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    document.addEventListener(type, event => {
      if (press?.id === event.pointerId) release();
    }, {passive:true});
  }
  window.addEventListener('blur',release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
}
setupPressFeedback();
