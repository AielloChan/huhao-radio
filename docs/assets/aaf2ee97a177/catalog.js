export const CLASSES = {
  A: {file:'questions.json', exam:{total:40, single:32, multiple:8, minutes:40, pass:30}},
  B: {file:'questions-b.json', exam:{total:60, single:45, multiple:15, minutes:60, pass:45}},
  C: {file:'questions-c.json', exam:{total:90, single:70, multiple:20, minutes:90, pass:70}}
};
export const CLASS_IDS = Object.keys(CLASSES);
export const SELECTED_CLASS_KEY = 'huhao-radio:class:v1';

export function classConfig(classId = 'A') {
  if (!CLASS_IDS.includes(classId)) throw new Error('不支持的题库类别');
  return CLASSES[classId];
}

export function selectedClass() {
  try {
    const saved = localStorage.getItem(SELECTED_CLASS_KEY);
    return CLASS_IDS.includes(saved) ? saved : 'A';
  } catch { return 'A'; }
}
