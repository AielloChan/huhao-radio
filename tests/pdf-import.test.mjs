import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const compact = value => value.replace(/\s/g, '');
const hash = value => createHash('sha256').update(value).digest('hex');

for (const [classId, count, single, multiple, imageCount] of [['B', 1143, 947, 196, 24], ['C', 1282, 1072, 210, 53]]) {
  test(`${classId} 类官方 PDF 题目字段完整且与留存文本逐题一致`, async () => {
    const directory = new URL(`data/${classId.toLowerCase()}/`, root);
    const source = await readFile(new URL('source.md', directory), 'utf8');
    const bank = JSON.parse(await readFile(new URL('questions.json', directory), 'utf8'));
    const report = JSON.parse(await readFile(new URL('import-report.json', directory), 'utf8'));
    assert.equal(hash(source), report.sourceSha256);
    assert.equal(report.provenance.userPdfSha256, report.provenance.officialPdfSha256);
    assert.equal(bank.questions.length, count);
    assert.equal(new Set(bank.questions.map(q => q.id)).size, count);
    assert.equal(bank.questions.filter(q => q.answers.length === 1).length, single);
    assert.equal(bank.questions.filter(q => q.answers.length > 1).length, multiple);
    assert.equal(bank.questions.filter(q => q.image).length, imageCount);
    assert.deepEqual(report.unresolved, []);
    assert.equal(bank.stats.usable, count);
    const records = source.split(/(?=\[J\])/).filter(text => text.includes('[I]')).map(text => {
      // One legacy question may have several consecutive [J] fields. Those have
      // no [I] and are irrelevant to this independent content/answer comparison.
      const fields = {};
      for (const match of text.matchAll(/\[([JPIQTABCDF])\]([^]*?)(?=\[[JPIQTABCDF]\]|$)/g)) fields[match[1]] = compact(match[2]);
      return fields;
    });
    assert.equal(records.length, count);
    for (const [index, question] of bank.questions.entries()) {
      const fields = records[index];
      assert.equal(question.id, fields.I);
      assert.equal(question.chapter, fields.P);
      assert.equal(compact(question.prompt), fields.Q);
      assert.match(question.answers.join(''), /^[ABCD]+$/);
      assert.equal(question.answers.join(''), fields.T);
      assert.equal(new Set(question.answers).size, question.answers.length);
      assert.deepEqual(question.options.map(o => o.id), ['A', 'B', 'C', 'D']);
      for (const option of question.options) assert.equal(compact(option.text), fields[option.id], question.id);
      assert.equal(Boolean(question.image), Boolean(fields.F), question.id);
      if (question.image) assert.equal(question.image, `./question-images/${fields.F.replace(/\.jpg$/, '.png')}`);
      assert.equal(question.issue, undefined);
    }
  });

  test(`${classId} 类附图存在、与核验报告哈希一致且是有效尺寸的 PNG`, async () => {
    const report = JSON.parse(await readFile(new URL(`data/${classId.toLowerCase()}/import-report.json`, root), 'utf8'));
    for (const image of report.recoveredImages) {
      const bytes = await readFile(new URL(`public/${image.image}`, root));
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.ok(bytes.readUInt32BE(16) > 100 && bytes.readUInt32BE(20) > 100, image.id);
      assert.equal(hash(bytes), image.sha256, image.id);
    }
  });
}

test('C 类跨页附图与指数、分式的来源标记保持完整', async () => {
  const bank = JSON.parse(await readFile(new URL('data/c/questions.json', root), 'utf8'));
  const report = JSON.parse(await readFile(new URL('data/c/import-report.json', root), 'utf8'));
  const question = id => bank.questions.find(q => q.id === id);
  assert.equal(question('MC1-0950').options[0].text, '10＾6，兆');
  assert.equal(question('MC1-1053').options[0].text, 'f = 1/（2π(LC)＾(1/2)）');
  assert.equal(question('MC2-1337').options[1].text, '10＾((x + y + z) / 10) 倍');
  assert.equal(question('MC1-1168').image, './question-images/LK0603.png');
  for (const name of ['LK0609.jpg', 'LK0610.jpg', 'LK0611.jpg']) {
    assert.equal(report.recoveredImages.find(image => image.sourceName === name).page, 1);
  }
  assert.equal(report.extraction.removedPageNumbers, 309);
  assert.equal(question('MC1-0009').answers.join(''), 'A');
});
