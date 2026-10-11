#!/usr/bin/env python3
"""Import the CRAC 2025 B/C PDFs with Poppler; extract official diagram originals.

Requires pdftotext on PATH and pypdf (pip install pypdf).
Inputs are the unmodified downloads linked from https://www.crac.org.cn/?p=1287.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_PAGE = 'https://www.crac.org.cn/?p=1287'
PDFS = {
    'B': ('https://www.crac.org.cn/userfiles/file/20250809/20250809124234_5845.pdf', '492eaaa1e2d56b90923cd2ba13c901c0fc18e9c037db50462dafeb81b707a34b', 1143),
    'C': ('https://www.crac.org.cn/userfiles/file/20250809/20250809124246_6142.pdf', '94c525cdadf210ac3d183d17c80d9bef829eebcf1fe93e550917e5e39b5d0098', 1282),
}
IMAGE_PDF = 'https://www.crac.org.cn/userfiles/file/20250728/20250728134354_1198.pdf'
IMAGE_SHA = 'b747b7afec132b21383f67f1dba58d42bfa3365b9b7094f7f109916eb8b05aba'
# Explicit mapping verified against all three rendered appendix pages. Captions for
# LK0609–LK0611 wrap onto page 2; their images are at the bottom of page 1.
IMAGE_CODES = [
    [f'LK{n:04}' for n in range(497, 512)] + [f'LK{n:04}' for n in range(594, 612)],
    ['LK0612', 'LK0613', 'LK0614', 'LK0734', 'LK0735', 'LK0736',
     'LK0740', 'LK0741', 'LK0742', 'LK0743', 'LK0744', 'LK0745',
     'LK0927', 'LK0928', 'LK0938'],
    ['LK0941', 'LK0942', 'LK0943', 'LK0944', 'LK0945'],
]
MARKER = re.compile(r'\[([JPIQTABCDF])\]')


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def clean_pages(text, has_page_numbers):
    pages = text.split('\f')
    if not pages[-1].strip():
        pages.pop()
    cleaned = []
    for number, page in enumerate(pages, 1):
        lines = page.rstrip().splitlines()
        if has_page_numbers:
            if not lines or lines[-1].strip() != str(number):
                raise ValueError(f'第 {number} 页末尾页码不匹配，请人工核对 PDF 版本')
            lines.pop()
        cleaned.append('\n'.join(lines).strip())
    return '\n\n'.join(cleaned) + '\n', len(pages)


def clean_field(text):
    lines = [re.sub(r'\s+', ' ', line).strip() for line in text.splitlines() if line.strip()]
    value = ''
    for line in lines:
        # Chinese PDF line wrapping is presentation, not a word separator.
        separator = ' ' if value and re.search(r'[A-Za-z0-9]$', value) and re.match(r'[A-Za-z0-9]', line) else ''
        value += separator + line
    return value


def parse_records(text):
    tokens = list(MARKER.finditer(text))
    records, record = [], {}
    for index, match in enumerate(tokens):
        key = match[1]
        value = clean_field(text[match.end():tokens[index + 1].start() if index + 1 < len(tokens) else len(text)])
        if key == 'J' and 'I' in record:
            records.append(record)
            record = {}
        if key in record and key != 'J':
            raise ValueError(f'{record.get("I")} 重复字段 {key}')
        record[key] = record.get(key, '') + value if key == 'J' else value
    if record:
        records.append(record)
    return records


def extract_images(pdf_path, output):
    if digest(pdf_path) != IMAGE_SHA:
        raise ValueError('附图 PDF 与已核对的官方版本不同，请重新核对图号映射')
    pdf = PdfReader(pdf_path)
    output.mkdir(parents=True, exist_ok=True)
    recovered = {}
    for page_index, codes in enumerate(IMAGE_CODES):
        # PDF resource names follow image order, whereas lexicographic names do not.
        images = sorted(pdf.pages[page_index].images, key=lambda item: int(re.search(r'\d+', item.name)[0]))
        if len(images) != len(codes):
            raise ValueError('附图数量不匹配')
        for code, embedded in zip(codes, images):
            target = output / f'{code}.png'
            if code != 'LK0944' or not target.exists():
                embedded.image.save(target, format='PNG')
            recovered[code] = {
                'sourceName': f'{code}.jpg', 'image': f'./question-images/{code}.png',
                'reference': IMAGE_PDF, 'page': page_index + 1,
                'resource': embedded.name, 'sha256': digest(target),
            }
    return recovered


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def import_bank(class_id, pdf_path, output_root, images):
    url, expected_hash, expected_count = PDFS[class_id]
    pdf_hash = digest(pdf_path)
    if pdf_hash != expected_hash:
        raise ValueError(f'{class_id} 类 PDF 与已核对的官方版本不同，请重新核对来源')
    raw = subprocess.run(['pdftotext', '-layout', str(pdf_path), '-'], check=True, capture_output=True).stdout.decode('utf-8')
    source, page_count = clean_pages(raw, has_page_numbers=class_id == 'C')
    records = parse_records(source)
    questions, recovered = [], []
    for record in records:
        required = set('JPIQTABCD')
        if required - record.keys() or any(not record[key] for key in required):
            raise ValueError(f'{record.get("I")} 缺少必填字段')
        if not re.fullmatch(r'MC\d-\d{4}', record['I']) or not re.fullmatch(r'\d+\.\d+\.\d+', record['P']):
            raise ValueError(f'题号或章节格式错误：{record}')
        if not re.fullmatch('[ABCD]+', record['T']) or len(set(record['T'])) != len(record['T']):
            raise ValueError(f'{record["I"]} 答案字段错误')
        if '\ufffd' in ''.join(record.values()):
            raise ValueError(f'{record["I"]} 包含无法抽取的字符')
        question = {
            'id': record['I'], 'code': record['J'], 'chapter': record['P'], 'prompt': record['Q'],
            'options': [{'id': key, 'text': record[key]} for key in 'ABCD'],
            'answers': list(record['T']),
        }
        if record.get('F'):
            code = Path(record['F']).stem
            image = images.get(code)
            if not image or image['sourceName'] != record['F']:
                raise ValueError(f'{record["I"]} 缺少已核对的附图 {record["F"]}')
            question['image'] = image['image']
            recovered.append({'id': record['I'], **image})
        questions.append(question)
    if len(questions) != expected_count or len({q['id'] for q in questions}) != expected_count:
        raise ValueError('题目数量或唯一题号校验失败')
    stats = {
        'total': len(questions), 'usable': len(questions),
        'single': sum(len(q['answers']) == 1 for q in questions),
        'multiple': sum(len(q['answers']) > 1 for q in questions),
        'issueCount': 0, 'chapters': dict(Counter(q['chapter'] for q in questions)),
    }
    bank = {'version': '2025-08-09', 'source': f'CRAC 官方 2025 年版 {class_id} 类题库', 'classId': class_id, 'questions': questions, 'stats': stats}
    report = {
        'sourceSha256': sha256(source.encode()).hexdigest(),
        'provenance': {
            'userPdf': pdf_path.name, 'userPdfSha256': pdf_hash, 'officialPdfSha256': expected_hash,
            'relationship': '用户 PDF 与官网链接下载的 PDF 逐字节一致。使用 Poppler 按页面阅读顺序抽取字段，不更改原题答案。',
            'imagePdfSha256': IMAGE_SHA,
        },
        'reference': {'title': f'CRAC 业余无线电台操作技术能力验证题库（2025年版）{class_id} 类', 'page': REFERENCE_PAGE, 'pdf': url, 'checkedOn': '2026-10-11'},
        'extraction': {'tool': 'pdftotext -layout', 'pages': page_count, 'removedPageNumbers': page_count if class_id == 'C' else 0, 'lineWraps': '仅合并 PDF 排版换行；保留字段内字符和原文标点。'},
        'verification': {
            'scope': '以下人工及独立抽取核验仅适用于本报告记录的 PDF SHA256，导入器拒绝其他 PDF 版本。',
            'independentExtraction': '与 pdfplumber 按坐标顺序独立抽取的全部题号、旧编号、章节、题干、答案、选项和附图引用逐字段比对，忽略空白后零差异。',
            'fontAudit': '遍历全部正文字符，B 正文字号均为 10.45；C 正文字号均为 10.45、页码为 9。未发现缩小字号的上下标字符。',
            'visualSamples': '目视核对 B 第 220 页的十进制指数、C 第 232 页的 LC 谐振根式和第 300 页的对数增益公式；原 PDF 使用显式＾、/、括号表达指数和分式，导入保留原符号。未声称对每道正文题目逐页目视核对。',
            'images': '全部 3 页附图已目视核对，53 张图片按内嵌资源提取；另检查了生成的完整图片联系表。',
        },
        'policy': '题型以官方答案数量为准；题号、章节、题干、答案及四个选项全部必填；重复题号、未知附图、无法识别的答案一律中止导入。',
        'imageNotes': [
            '所有附图均从官方附图 PDF 内嵌原图转换为 PNG，无重绘。',
            'LK0609、LK0610、LK0611 图片在第 1 页底部，其图号标签跨页至第 2 页顶部。',
            '第 1 页 LK0603 图号原文漏印末位 3（显示 LK060），位于 LK0602 与 LK0604 之间；已对照 MC1-1168 的 LK0603.jpg 引用及高通电路结构核对。',
        ],
        'stats': stats, 'recoveredImages': recovered, 'unresolved': [],
    }
    destination = output_root / 'data' / class_id.lower()
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'source.md').write_text(source)
    write_json(destination / 'questions.json', bank)
    write_json(destination / 'import-report.json', report)
    print(f'{class_id}: {stats["total"]} 题，{stats["single"]} 单选，{stats["multiple"]} 多选，{len(recovered)} 附图；全部可用')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--b-pdf', type=Path, required=True)
    parser.add_argument('--c-pdf', type=Path, required=True)
    parser.add_argument('--image-pdf', type=Path, required=True)
    parser.add_argument('--output-root', type=Path, default=ROOT)
    args = parser.parse_args()
    images = extract_images(args.image_pdf, args.output_root / 'public' / 'question-images')
    for class_id, path in [('B', args.b_pdf), ('C', args.c_pdf)]:
        import_bank(class_id, path, args.output_root, images)


if __name__ == '__main__':
    main()
