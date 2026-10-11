import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseQuestions } from '../scripts/import-questions.mjs';

const source = await readFile(new URL('../data/source.md', import.meta.url), 'utf8');
const { bank, report } = parseQuestions(source);
const find = id => bank.questions.find(question => question.id === id);

test('imports the complete supplied bank without losing or duplicating questions', () => {
  assert.equal(bank.stats.total, 683);
  assert.equal(bank.stats.usable, 683);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, 683);
  assert.equal(report.sourceSha256, '356fcf8cae861c3d8a9ec83e8d15f1c2b53edd75ab2cac0d2f20d1817446494c');
  for (const question of bank.questions) {
    assert.equal(question.options.length, 4);
    assert.ok(question.answers.length >= 1);
    assert.ok(question.answers.every(answer => question.options.some(option => option.id === answer)));
  }
});

test('recovers text displaced into question ID, answer and option fields', () => {
  assert.match(find('MC3-0056').prompt, /技术能力验证：$/);
  assert.equal(find('MC1-0009').answers.join(''), 'A');
  assert.match(find('MC1-0009').prompt, /一个频段被标明划分/);
  assert.equal(find('MC1-0004').options[3].text, '《无线电台执照管理规定》');
  assert.match(find('MC1-0004').prompt, /“卫星业余业务”和“业余电台”/);
  assert.ok(find('MC1-0107').options.every(option => option.text.endsWith('电台执照')));
  assert.match(find('MC1-0599').options[1].text, /收不到有用信号时自动关断背景噪声$/);
  assert.equal(report.repairedQuestions, 43);
});

test('reads out-of-order question markers and retains actual multi-answer keys', () => {
  assert.match(find('MC1-0008').prompt, /批准给无线电台/);
  assert.deepEqual(find('MC1-0016').answers, ['A', 'B']);
  assert.equal(bank.stats.single + bank.stats.multiple, bank.stats.total);
});

test('recovers the diagram from the official appendix with a real PNG asset', async () => {
  assert.equal(report.unresolved.length, 0);
  assert.equal(find('MC1-0665').issue, undefined);
  assert.equal(find('MC1-0665').image, './question-images/LK0944.png');
  const image = await readFile(new URL('../public/question-images/LK0944.png', import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(report.provenance.userPdfSha256, '871cf0290e5d89da926216f95eeecbc2ef46a5d8a10eaa2a29dab018736d14a3');
});

test('still flags an unknown image rather than inventing a diagram', () => {
  const changed = parseQuestions(source.replace('[F]LK0944.jpg', '[F]unknown.jpg'));
  assert.equal(changed.report.unresolved.length, 1);
  assert.equal(changed.bank.stats.usable, 682);
  assert.match(changed.report.unresolved[0].message, /unknown.jpg/);
});

test('generated data is reproducible', async () => {
  const savedBank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'));
  const savedReport = JSON.parse(await readFile(new URL('../data/import-report.json', import.meta.url), 'utf8'));
  assert.deepEqual(bank, savedBank);
  assert.deepEqual(report, savedReport);
});

test('rejects changed damaged fields rather than guessing how to repair them', () => {
  assert.throws(() => parseQuestions(source.replace('[T]A一个频段被标明', '[T]A另一个频段被标明')), /已变化/);
});

test('rejects ambiguous answer keys and duplicate question IDs', () => {
  assert.throws(() => parseQuestions(source.replace('[T]AC', '[T]AZ')), /答案无法确定/);
  assert.throws(() => parseQuestions(source.replace('[I]MC2-0002', '[I]MC2-0001')), /重复题号/);
  assert.throws(() => parseQuestions(''), /题库为空/);
});
