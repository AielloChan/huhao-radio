export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  radio: '<rect x="4" y="9" width="16" height="11" rx="3"/><path d="m6 9 12-6M8 13h3M8 16h3"/><circle cx="16" cy="15" r="2"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',
  exam: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/>',
  wrong: '<path d="M6 3h12v19l-6-4-6 4zM12 7v5M12 15h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  signal: '<path d="M4 19v-3M9 19v-7M14 19V8M19 19V4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.radio}</svg>`;
export const button = (label, action, cls = 'primary', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
export function dateLabel(time) { return new Date(time).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false}); }
export function empty(title, detail, action = '') { return `<div class="empty"><div class="empty-symbol">${icon('signal')}</div><h2>${title}</h2><p>${detail}</p>${action}</div>`; }
export function showDialog(content) {
  const dialog = document.querySelector('#dialog');
  dialog.innerHTML = `<div class="dialog-body">${content}</div>`;
  if (!dialog.open) dialog.showModal();
}
export function closeDialog() { document.querySelector('#dialog').close(); }
