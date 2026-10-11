import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const officialSource = 'https://www.crac.org.cn/userfiles/file/20250809/20250809124220_1161.pdf';
// These narrowly scoped repairs move text already present in the supplied Markdown.
// Each was checked against the matching question in the CRAC 2025 A-class PDF.
// Exact before values prevent silently applying old repairs to a changed question bank.
const verifiedRepairs = {
  "MC1-0004": {"Q": {"before": "我国对无线电管理术语“业余业务”、法规文件是：", "after": "我国对无线电管理术语“业余业务”、“卫星业余业务”和“业余电台”做出具体定义的法规文件是："}, "D": {"before": "《无线电台执照管理规定》“卫星业余业务”和“业余电台”做出具体定义的", "after": "《无线电台执照管理规定》"}},
  "MC1-0009": {"Q": {"before": "在频率划分表中，", "after": "在频率划分表中，一个频段被标明划分给多种业务时，这些业务被分为下述类别："}, "T": {"before": "A一个频段被标明划分给多种业务时，这些业务被分为下述类别：", "after": "A"}},
  "MC3-0056": {"Q": {"before": "国家无线电管理机构及其委托的机构可以组织实施如下类别的业余无线电台操作技术能", "after": "国家无线电管理机构及其委托的机构可以组织实施如下类别的业余无线电台操作技术能力验证："}, "I": {"before": "MC3-0056力验证：", "after": "MC3-0056"}},
  "MC1-0107": {"C": {"before": "每台设备视为一个业余电台，各指配一个电台呼号，并都应经过核定并将参数载入电台", "after": "每台设备视为一个业余电台，各指配一个电台呼号，并都应经过核定并将参数载入电台执照"}, "A": {"before": "视为一个业余电台，指配一个电台呼号，但所有设备均应经过核定并将参数载入电台执", "after": "视为一个业余电台，指配一个电台呼号，但所有设备均应经过核定并将参数载入电台执照"}, "B": {"before": "视为一个业余电台，指配一个电台呼号，其中只需有一台设备加以核定并将参数载入电", "after": "视为一个业余电台，指配一个电台呼号，其中只需有一台设备加以核定并将参数载入电台执照"}, "D": {"before": "视为一个业余电台，指配一个电台呼号，每个频段选择一台设备加以核定并将参数载入", "after": "视为一个业余电台，指配一个电台呼号，每个频段选择一台设备加以核定并将参数载入电台执照"}, "T": {"before": "A照台执照执照电台执照", "after": "A"}},
  "MC1-0124": {"Q": {"before": "国家对于利用业余无线电台从事发布、传播违反法律或者公共道德的信息的行为的态度", "after": "国家对于利用业余无线电台从事发布、传播违反法律或者公共道德的信息的行为的态度是："}, "I": {"before": "MC1-0124是：", "after": "MC1-0124"}},
  "MC1-0148": {"Q": {"before": "无线电管制是指在下列范围内依法采取的对无线电波的发射、辐射和传播实施的强制性", "after": "无线电管制是指在下列范围内依法采取的对无线电波的发射、辐射和传播实施的强制性管理："}, "I": {"before": "MC1-0148管理：", "after": "MC1-0148"}},
  "MC1-0221": {"Q": {"before": "我国《无线电频率划分规定》划分给业余业务使用的 50MHz-54MHz 属于无线电频谱的", "after": "我国《无线电频率划分规定》划分给业余业务使用的 50MHz-54MHz 属于无线电频谱的下列频段（波段）："}, "I": {"before": "MC1-0221下列频段（波段）：", "after": "MC1-0221"}},
  "MC1-0222": {"Q": {"before": "我国《无线电频率划分规定》划分给业余业务使用的 50MHz-54MHz 属于无线电频谱的", "after": "我国《无线电频率划分规定》划分给业余业务使用的 50MHz-54MHz 属于无线电频谱的下列频段（波段）："}, "I": {"before": "MC1-0222下列频段（波段）：", "after": "MC1-0222"}},
  "MC1-0265": {"Q": {"before": "在现代业余无线电通信中，信号报告均采用“RST 格式”", "after": "在现代业余无线电通信中，信号报告均采用“RST 格式”。缩语 RST 中的字母 R 代表："}, "D": {"before": "Q 简语 QRK。缩语 RST 中的字母 R 代表：", "after": "Q 简语 QRK"}},
  "MC1-0270": {"Q": {"before": "在请求插入两个电台间的对话之时，", "after": "在请求插入两个电台间的对话之时，一个值得借鉴的经验是："}, "T": {"before": "A一个值得借鉴的经验是：", "after": "A"}},
  "MC1-0306": {"Q": {"before": "业余电台在发起呼叫前应先守听一段时间，然后再询问“有人使用频率吗？”应答方可发起呼叫。下列英语短句中不能正确表达这一询问的是：", "after": "业余电台在发起呼叫前应先守听一段时间，然后再询问“有人使用频率吗？”，确认没有应答方可发起呼叫。下列英语短句中不能正确表达这一询问的是："}, "D": {"before": "Anybody here？，确认没有", "after": "Anybody here？"}},
  "MC1-0311": {"Q": {"before": "建立话音通信后，操作员小明打算给对方电台 BH1ZZZ“57”的信号报告。他可以这样", "after": "建立话音通信后，操作员小明打算给对方电台 BH1ZZZ “57”的信号报告。他可以这样讲："}, "I": {"before": "MC1-0311讲：", "after": "MC1-0311"}},
  "MC1-0312": {"Q": {"before": "建立话音通信后，操作员小明打算给对方电台 BH1ZZZ“57”的信号报告。他可以这样", "after": "建立话音通信后，操作员小明打算给对方电台 BH1ZZZ “57”的信号报告。他可以这样讲："}, "I": {"before": "MC1-0312讲：", "after": "MC1-0312"}},
  "MC1-0315": {"Q": {"before": "收听业余无线电爱好者的 SSB 通联时，我们有时会听到 “Cheerio.”“Do svidaniya.”一类的短句。其含义是：", "after": "收听业余无线电爱好者的 SSB 通联时，我们有时会听到 “Cheerio.”、“Ciao ciao.”或“Do svidaniya.”一类的短句。其含义是："}, "D": {"before": "从一种语言至另一种语言的转写、“Ciao ciao.”或", "after": "从一种语言至另一种语言的转写"}},
  "MC1-0350": {"Q": {"before": "结束当天的通联活动时，业余电台常会发送 Q 简语“QRT”", "after": "结束当天的通联活动时，业余电台常会发送 Q 简语“QRT”。其含义为："}, "D": {"before": "我要变更操作方式了，有要联络的请尽快叫过来。其含义为：", "after": "我要变更操作方式了，有要联络的请尽快叫过来"}},
  "MC1-0353": {"Q": {"before": "通联时，如希望相约对方参加某个业余无线电活动（如，可使用短句：", "after": "通联时，如希望相约对方参加某个业余无线电活动（如，“木兰围场-通联中国之省”），可使用短句："}, "D": {"before": "QRT OVER WAPC?“木兰围场-通联中国之省”），", "after": "QRT OVER WAPC?"}},
  "MC1-0367": {"Q": {"before": "通联时，如需了解对方电台可否帮助转信至“xxx 电台”", "after": "通联时，如需了解对方电台可否帮助转信至“xxx 电台”，可使用短句："}, "D": {"before": "QRV ×××？，可使用短句：", "after": "QRV ×××？"}},
  "MC1-0381": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“CK”", "after": "在 CW 通联中，我们有时会抄到缩语“CK”，意思是："}, "D": {"before": "祝贺，意思是：", "after": "祝贺"}},
  "MC1-0384": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“ES”", "after": "在 CW 通联中，我们有时会抄到缩语“ES”，意思是："}, "D": {"before": "请等待，意思是：", "after": "请等待"}},
  "MC1-0385": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“FB”", "after": "在 CW 通联中，我们有时会抄到缩语“FB”，意思是："}, "D": {"before": "从正反两方面说，意思是：", "after": "从正反两方面说"}},
  "MC1-0386": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“FER”", "after": "在 CW 通联中，我们有时会抄到缩语“FER”，意思是："}, "D": {"before": "猎狐，意思是：", "after": "猎狐"}},
  "MC1-0397": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“HPE”", "after": "在 CW 通联中，我们有时会抄到缩语“HPE”，意思是："}, "D": {"before": "是“这里”的意思，意思是：", "after": "是“这里”的意思"}},
  "MC1-0398": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“HPY”或“HPI”", "after": "在 CW 通联中，我们有时会抄到缩语“HPY”或“HPI”，意思是："}, "D": {"before": "这里，意思是：", "after": "这里"}},
  "MC1-0404": {"Q": {"before": "通联时，我们有时称对方电台的操作员为“old man”因此为“老朋友”、“老伙计”之意且无关年龄。这个称呼的缩语是：", "after": "通联时，我们有时称对方电台的操作员为“old man”。这是将对方比作亲密无间的队友，因此为“老朋友”、“老伙计”之意且无关年龄。这个称呼的缩语是："}, "T": {"before": "A。这是将对方比作亲密无间的队友，", "after": "A"}},
  "MC1-0408": {"C": {"before": "请尽快寄出 QSL 卡片“SAE”的含义为：", "after": "请尽快寄出 QSL 卡片"}, "Q": {"before": "业余无线电业务中，", "after": "业余无线电业务中，“SAE”的含义为："}},
  "MC1-0409": {"Q": {"before": "业余无线电爱好者寄送 QSL 卡片时常会提及缩语“SASE”", "after": "业余无线电爱好者寄送 QSL 卡片时常会提及缩语“SASE”，其含义为："}, "D": {"before": "请勿通过卡片管理局交换 QSL 卡片，其含义为：", "after": "请勿通过卡片管理局交换 QSL 卡片"}},
  "MC1-0415": {"Q": {"before": "在 CW 通联中，我们有时会抄到缩语“WL”", "after": "在 CW 通联中，我们有时会抄到缩语“WL”，意思是："}, "D": {"before": "滑铁卢，意思是：", "after": "滑铁卢"}},
  "MC1-0416": {"Q": {"before": "收听 CW 或 SSB 联络，我们有时会听到缩语 “XYL”", "after": "收听 CW 或 SSB 联络，我们有时会听到缩语 “XYL”。其含义是："}, "D": {"before": "发信机。其含义是：", "after": "发信机"}},
  "MC1-0417": {"Q": {"before": "有一类业余无线电操作员享有称呼“YL”享的规则。缩语“YL”的含义是：", "after": "有一类业余无线电操作员享有称呼“YL”。而有些业余无线电竞赛也为这些人士制定了专享的规则。缩语“YL”的含义是："}, "T": {"before": "A。而有些业余无线电竞赛也为这些人士制定了专", "after": "A"}},
  "MC1-0446": {"A": {"before": "调频话信道带宽超过传输莫尔斯电码的必要带宽，不符合我国《无线电频率划分规定》“电一章关于 “把带宽保持在技术状态和该项业务的性质所允许的最低值上”台的技术特性”的要求", "after": "调频话信道带宽超过传输莫尔斯电码的必要带宽，不符合我国《无线电频率划分规定》“电台的技术特性”一章关于 “把带宽保持在技术状态和该项业务的性质所允许的最低值上”的要求"}},
  "MC3-0512": {"Q": {"before": "Yaesu System Fusion 简称 YSF，是数字语音和数据传输相互融合的一种通信方式，特", "after": "Yaesu System Fusion 简称 YSF，是数字语音和数据传输相互融合的一种通信方式，特点是："}, "I": {"before": "MC3-0512点是：", "after": "MC3-0512"}},
  "MC1-0598": {"Q": {"before": "如果进行 SSB 或 CW 通联时周边环境嘈杂，哪种设备可以替代电台上的扬声器，改善话", "after": "如果进行 SSB 或 CW 通联时周边环境嘈杂，哪种设备可以替代电台上的扬声器，改善话音抄收？"}, "I": {"before": "MC1-0598音抄收？", "after": "MC1-0598"}},
  "MC1-0599": {"C": {"before": "NB 和 SQL 都是指“静噪”", "after": "NB 和 SQL 都是指“静噪”，切除高于平均信号的大幅度突发脉冲噪声"}, "B": {"before": "NB 和 SQL 都是指“抑噪”", "after": "NB 和 SQL 都是指“抑噪”，收不到有用信号时自动关断背景噪声"}, "D": {"before": "NB 和 SQL 都是指“静噪”，收不到有用信号时自动关断背景噪声，切除高于平均信号的大幅度突发脉冲噪声，收不到带有预期的特定控制信号时自动关断音频输出", "after": "NB 和 SQL 都是指“静噪”，收不到带有预期的特定控制信号时自动关断音频输出"}},
  "MC1-0657": {"Q": {"before": "我们之所以称垂直接地天线为“全向天线”", "after": "我们之所以称垂直接地天线为“全向天线”，是因为："}, "D": {"before": "这种天线辐射各向同性的球面波，是因为：", "after": "这种天线辐射各向同性的球面波"}},
  "MC3-0670": {"Q": {"before": "业余无线电爱好者讨论天线系统时常会提及术语 “驻波比（SWR）”", "after": "业余无线电爱好者讨论天线系统时常会提及术语 “驻波比（SWR）”。其含义为："}, "D": {"before": "如果传输线中出现驻波，则调整传输线始端的信源阻抗可使驻波归零。其含义为：", "after": "如果传输线中出现驻波，则调整传输线始端的信源阻抗可使驻波归零"}},
  "MC1-0703": {"Q": {"before": "在视距通联中，已知发射天线为指向接收点的左旋圆极化天线，接收天线的最佳极化方", "after": "在视距通联中，已知发射天线为指向接收点的左旋圆极化天线，接收天线的最佳极化方式为："}, "I": {"before": "MC1-0703式为：", "after": "MC1-0703"}},
  "MC1-0718": {"Q": {"before": "有时，VHF/UHF 业余波段中可能出现远达 500 千米的“超视距传播”信号。这与下列哪", "after": "有时，VHF/UHF 业余波段中可能出现远达 500 千米的“超视距传播”信号。这与下列哪种现象密切相关？"}, "I": {"before": "MC1-0718种现象密切相关？", "after": "MC1-0718"}},
  "MC1-0885": {"Q": {"before": "不产生任何内部噪声的理想放大器或接收机的噪声系数 Fn、噪声指数 NF 和噪声温度 Te", "after": "不产生任何内部噪声的理想放大器或接收机的噪声系数 Fn、噪声指数 NF 和噪声温度 Te分别为："}, "I": {"before": "MC1-0885分别为：", "after": "MC1-0885"}},
  "MC1-0910": {"Q": {"before": "我国发射的第一颗业余卫星的发射年份、名称、国际 OSCAR 系列号和转发器模式分别", "after": "我国发射的第一颗业余卫星的发射年份、名称、国际 OSCAR 系列号和转发器模式分别为："}, "I": {"before": "MC1-0910为：", "after": "MC1-0910"}},
  "MC1-0927": {"Q": {"before": "交流电（AC）是以电荷的运动方向随时间交替变化来定义的。关于交流电，以下描述正", "after": "交流电（AC）是以电荷的运动方向随时间交替变化来定义的。关于交流电，以下描述正确的是："}, "I": {"before": "MC1-0927确的是：", "after": "MC1-0927"}},
  "MC1-0950": {"Q": {"before": "在法定计量单位中，词头 M 的数学意义和文字含义分别为：（“x＾m”表示“x 的 m 次", "after": "在法定计量单位中，词头 M 的数学意义和文字含义分别为：（“x＾m”表示“x 的 m 次方”）"}, "I": {"before": "MC1-0950方”）", "after": "MC1-0950"}},
  "MC1-1299": {"Q": {"before": "如果用磁电式万用表的交流电压档测量正负对称的方波电压（占空比为 1:1），其指针所", "after": "如果用磁电式万用表的交流电压档测量正负对称的方波电压（占空比为 1:1），其指针所示的电压读数："}, "I": {"before": "MC1-1299示的电压读数：", "after": "MC1-1299"}},
  "MC1-1300": {"Q": {"before": "用指针式万用表的直流电压档测量最小值为 0 的方波电压（占空比为 1:1），得到的读数", "after": "用指针式万用表的直流电压档测量最小值为 0 的方波电压（占空比为 1:1），得到的读数是该电压的："}, "I": {"before": "MC1-1300是该电压的：", "after": "MC1-1300"}},
};

const recoveredImages = {
  'MC1-0665': {
    sourceName: 'LK0944.jpg', image: './question-images/LK0944.png',
    reference: 'https://www.crac.org.cn/userfiles/file/20250728/20250728134354_1198.pdf',
    page: 3, sha256: '5297f593eccf5e27f9f4bd346d9d4205988c8c9092ac412e98a4f4ef49571fe3',
  },
};
const sourceProvenance = {
  markdownSha256: '356fcf8cae861c3d8a9ec83e8d15f1c2b53edd75ab2cac0d2f20d1817446494c',
  userPdf: '业余无线电A证题库.pdf',
  userPdfSha256: '871cf0290e5d89da926216f95eeecbc2ef46a5d8a10eaa2a29dab018736d14a3',
  relationship: '用户确认 Markdown 由所提供 PDF 全选复制得到；本地 PDF 与 CRAC 官方 A 类 PDF 的 SHA256 完全一致。683 题的题号、旧编号、章节、题干、答案和选项已逐字段与 PDF 比对，忽略空白后全部一致。',
  imageRecovery: '用户 PDF 第 112 页仅引用 LK0944.jpg，无内嵌图片。已从同发布页官方附图 PDF 第 3 页提取原图并目视核对 A、B、C 标记及对应题号。',
  imagePdfSha256: 'b747b7afec132b21383f67f1dba58d42bfa3365b9b7094f7f109916eb8b05aba',
};

const markerPattern = /\[([JPIQTABCDF])\]/g;
const compact = value => value.replace(/\s+/g, '');
const clean = value => value.replace(/\r/g, '').trim();

export function parseQuestions(sourceText) {
  const tokens = [...sourceText.matchAll(markerPattern)];
  const records = [];
  let record = { fields: {}, order: [] };
  for (const [index, token] of tokens.entries()) {
    const key = token[1];
    const value = clean(sourceText.slice(token.index + token[0].length, tokens[index + 1]?.index ?? sourceText.length));
    if (key === 'J' && record.fields.I) {
      records.push(record);
      record = { fields: {}, order: [] };
    }
    if (key in record.fields && key !== 'J') throw new Error(`重复字段 ${key}: ${record.fields.I ?? '无题号'}`);
    record.fields[key] = key === 'J' ? (record.fields.J ?? '') + value : value;
    record.order.push(key);
  }
  if (Object.keys(record.fields).length) records.push(record);
  const repairs = [];
  const unresolved = [];
  const ids = new Set();
  const questions = records.map(({ fields, order }) => {
    const id = fields.I?.match(/^MC\d-\d{4}/)?.[0];
    if (!id) throw new Error(`无效题号：${fields.I ?? '缺失'}`);
    if (ids.has(id)) throw new Error(`重复题号：${id}`);
    ids.add(id);
    const verified = verifiedRepairs[id];
    if (verified) {
      for (const [field, patch] of Object.entries(verified)) {
        if (compact(fields[field] ?? '') === compact(patch.after)) continue;
        if (compact(fields[field] ?? '') !== compact(patch.before)) throw new Error(`${id} 的 ${field} 字段已变化，请重新核对修补`);
        fields[field] = patch.after;
        repairs.push({ id, kind: 'text-recovery', field, before: patch.before, after: patch.after, evidence: officialSource });
      }
    }
    if (order.indexOf('Q') > order.indexOf('T')) {
      repairs.push({ id, kind: 'marker-order', detail: '按标签读取位于答案或选项之后的题干，恢复为标准字段顺序' });
    }
    if (order.filter(key => key === 'J').length > 1) {
      repairs.push({ id, kind: 'multiple-codes', detail: '合并同一道题的多个旧题编号，保留原始顿号' });
    }
    for (const required of ['J', 'P', 'I', 'Q', 'T', 'A', 'B', 'C', 'D']) {
      if (!fields[required]) throw new Error(`${id} 缺少 ${required} 字段`);
    }
    if (!/^MC\d-\d{4}$/.test(fields.I)) throw new Error(`${id} 的题号有未恢复的续行`);
    if (!/^[ABCD]+$/.test(fields.T) || new Set(fields.T).size !== fields.T.length) throw new Error(`${id} 的答案无法确定：${fields.T}`);
    const question = {
      id, code: fields.J, chapter: fields.P, prompt: fields.Q,
      options: ['A', 'B', 'C', 'D'].map(option => ({ id: option, text: fields[option] })),
      answers: [...fields.T],
    };
    if (fields.F && recoveredImages[id]?.sourceName === fields.F) {
      question.image = recoveredImages[id].image;
    } else if (fields.F) {
      question.issue = `原始题库引用图片 ${fields.F}，但未提供图片；暂不纳入练习或模拟考试。`;
      unresolved.push({ id, type: 'missing-image', file: fields.F, message: question.issue });
    }
    return question;
  });
  if (!questions.length) throw new Error('题库为空');
  const chapters = {};
  for (const question of questions) chapters[question.chapter] = (chapters[question.chapter] ?? 0) + 1;
  const stats = {
    total: questions.length,
    usable: questions.filter(question => !question.issue).length,
    single: questions.filter(question => question.answers.length === 1).length,
    multiple: questions.filter(question => question.answers.length > 1).length,
    issueCount: unresolved.length,
    chapters,
  };
  const sha256 = createHash('sha256').update(sourceText).digest('hex');
  return {
    bank: { version: '2026-10-11', source: '用户提供的 A 类题库', questions, stats },
    report: {
      sourceSha256: sha256,
      ...(sha256 === sourceProvenance.markdownSha256 ? { provenance: sourceProvenance } : {}),
      recoveredImages: questions.filter(question => question.image).map(question => ({ id: question.id, ...recoveredImages[question.id] })),
      reference: { title: 'CRAC 业余无线电台操作技术能力验证题库（2025年版）A 类', page: 'https://www.crac.org.cn/?p=1287', pdf: officialSource, checkedOn: '2026-10-11' },
      policy: '原始 Markdown 作为题库来源；只恢复已与官方同编号题核对的抽取错位；不猜测或改变答案。题型以答案数量为准，不能用 MC1 等题号前缀推断。缺图题暂不参与练习和考试。',
      stats,
      repairedQuestions: new Set(repairs.filter(repair => repair.kind === 'text-recovery').map(repair => repair.id)).size,
      repairs,
      unresolved,
    },
  };
}

export async function importQuestions(inputPath, outputDirectory) {
  const sourceText = await readFile(inputPath, 'utf8');
  const result = parseQuestions(sourceText);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'source.md'), sourceText);
  await writeFile(resolve(outputDirectory, 'questions.json'), JSON.stringify(result.bank, null, 2) + '\n');
  await writeFile(resolve(outputDirectory, 'import-report.json'), JSON.stringify(result.report, null, 2) + '\n');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const inputPath = resolve(process.argv[2] ?? resolve(projectDirectory, 'data/source.md'));
  const outputDirectory = resolve(process.argv[3] ?? resolve(projectDirectory, 'data'));
  const { bank, report } = await importQuestions(inputPath, outputDirectory);
  console.log(`导入 ${bank.stats.total} 题，可用 ${bank.stats.usable} 题；恢复 ${report.repairedQuestions} 题文本，待确认 ${report.unresolved.length} 题。`);
}
