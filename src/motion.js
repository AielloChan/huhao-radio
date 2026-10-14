import {TABS} from './view-state.js';

const settle = 'cubic-bezier(.22,1,.36,1)';

export function setupMotion(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let previous = null;
  let radio = null;
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries=>{
    for (const entry of entries) entry.target.classList.toggle('is-motion-visible',entry.isIntersecting);
  }) : null;

  function cancel() {
    for (const animation of [...animations]) animation.cancel();
    animations.clear();
  }
  function animate(element, frames, options = {}, complete = () => {}) {
    if (!element?.animate || reduced.matches || document.hidden) return;
    const animation = element.animate(frames,{duration:320,easing:settle,...options});
    animations.add(animation);
    const done = () => {animations.delete(animation);complete();};
    animation.onfinish = done;
    animation.oncancel = done;
  }
  function enter(element, x = 0, y = 10, duration = 360, delay = 0) {
    animate(element,[
      {opacity:0,transform:`translate3d(${x}px,${y}px,0) scale(.988)`},
      {opacity:1,transform:`translate3d(${-x*.045}px,${-y*.08}px,0) scale(1.001)`,offset:.78},
      {opacity:1,transform:'translate3d(0,0,0) scale(1)'}
    ],{duration,delay,fill:'backwards'});
  }
  function counter(from, to, direction) {
    const number = root.querySelector('.quiz-progress strong');
    if (!number || from === to) return;
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = String(to);
    const reel = document.createElement('span');
    reel.className = 'number-reel';
    reel.setAttribute('aria-hidden','true');
    const oldFace = document.createElement('span');
    const newFace = document.createElement('span');
    oldFace.textContent = String(from);
    oldFace.style.opacity = '0';
    newFace.textContent = String(to);
    reel.append(oldFace,newFace);
    number.replaceChildren(accessible,reel);
    animate(oldFace,[{transform:'translateY(0)',opacity:1},{transform:`translateY(${-direction*110}%)`,opacity:0}],{duration:280});
    animate(newFace,[{transform:`translateY(${direction*110}%)`,opacity:0},{transform:'translateY(0)',opacity:1}],{duration:360},()=>{
      if (number.isConnected) number.textContent = String(to);
    });
  }
  function observeRadio() {
    if (radio) observer?.unobserve(radio);
    radio = root.querySelector('.radio-art');
    if (!radio) return;
    // A status render retains the ambient phase instead of restarting the pulse.
    radio.style.setProperty('--wave-phase',`${-(performance.now()%6000)}ms`);
    radio.style.setProperty('--float-phase',`${-(performance.now()%5200)}ms`);
    if (observer) observer.observe(radio);
    else radio.classList.add('is-motion-visible');
  }
  function afterRender(next) {
    const before = previous;
    previous = next;
    observeRadio();
    if (!before || reduced.matches || document.hidden) return;
    if (before.page !== next.page) {
      const direction = Math.sign(TABS.indexOf(next.tab)-TABS.indexOf(before.tab));
      if (next.screen === 'quiz') {
        enter(root.querySelector('.question-card'),18,0);
        enter(root.querySelector('.quiz-top'),0,5,240);
      } else enter(root.querySelector('#main'),direction*14,6);
      return;
    }
    if (next.screen !== 'quiz') return;
    if (before.question !== next.question) {
      const direction = Math.sign(next.index-before.index) || 1;
      enter(root.querySelector('.question-card'),direction*24,0,380);
      root.querySelectorAll('.option').forEach((option,index)=>enter(option,0,5,280,index*18));
      counter(before.index+1,next.index+1,direction);
    } else if (!before.checked && next.checked) {
      enter(root.querySelector('.answer-feedback'),0,8,340);
      animate(root.querySelector('.answer-feedback .icon'),[{transform:'scale(.7)'},{transform:'scale(1.12)',offset:.6},{transform:'scale(1)'}]);
    } else if (before.selection !== next.selection) {
      for (const option of root.querySelectorAll('.option.selected')) {
        if (before.selection.split(',').includes(option.dataset.id)) continue;
        animate(option,[{transform:'scale(.985)'},{transform:'scale(1.004)',offset:.65},{transform:'scale(1)'}],{duration:260});
      }
    }
  }
  function visibility() {
    document.body.classList.toggle('motion-paused',document.hidden);
    if (document.hidden) cancel();
  }
  reduced.addEventListener('change',cancel);
  document.addEventListener('visibilitychange',visibility);
  visibility();
  return {beforeRender:cancel, afterRender};
}
