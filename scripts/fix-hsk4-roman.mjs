import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('./lib/hsk4-data.ts');
const outputPath = path.resolve('./lib/hsk4-data.ts');

function romanizeThai(text = '') {
  if (!text) return '';

  const cleaned = text
    .replace(/[“”"']/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordMap = {
    'ความรัก': 'khwam rak',
    'จัดการ': 'chatkan',
    'วางแผน': 'wang phaen',
    'ปลอดภัย': 'plodphai',
    'ความปลอดภัย': 'khwam plodphai',
    'ตรงเวลา': 'trong wela',
    'ตาม': 'tam',
    'ตามที่': 'tam thi',
    'เปอร์เซ็นต์': 'เปอร์เซ็นต์',
    'เยี่ยม': 'yiam',
    'เก่ง': 'keng',
    'ซาลาเปา': 'salapao',
    'ปกป้อง': 'pokpong',
    'คุ้มครอง': 'khumkhrong',
    'รับประกัน': 'rap prakan',
    'สมัคร': 'samak',
    'ลงทะเบียน': 'long thabian',
    'กอด': 'kot',
    'อุ้ม': 'um',
    'ขอโทษ': 'kho thot',
    'เท่า': 'thao',
    'เท่าตัว': 'thao tua',
    'เดิมที': 'doem thi',
    'โง่': 'ngo',
    'ทึ่ม': 'thuem',
    'เช่น': 'chen',
    'ตัวอย่างเช่น': 'tua yang chen',
    'เรียนจบ': 'rian chop',
    'รอบ': 'rop',
    'ครั้ง': 'khrang',
    'มาตรฐาน': 'mattrathan',
    'แบบฟอร์ม': 'baep form',
    'ตาราง': 'tarang',
    'แสดง': 'sa-daeng',
    'ชมเชย': 'chomchoei',
    'บิสกิต': 'biskit',
    'คุกกี้': 'khukki',
    'และ': 'lae',
    'อีกทั้ง': 'ik thang',
    'ปริญญาเอก': 'parinya ek',
    'แต่ว่า': 'tae wa',
    'อย่างไรก็ตาม': 'yangrai ko tam',
    'จำเป็นต้อง': 'champen tong',
    'ไม่ว่า': 'mai wa',
    'ไม่เพียงแต่': 'mai phiang tae',
    'ส่วนหนึ่ง': 'suan nueng',
    'บางส่วน': 'bang suan',
    'เช็ด': 'chet',
    'เดา': 'dao',
    'วัสดุ': 'watsadu',
    'ข้อมูล': 'khomun',
    'เยี่ยมชม': 'yiam chom',
    'ร้านอาหาร': 'ran ahan',
    'ห้องน้ำ': 'hong nam',
    'เกือบ': 'kueap',
    'ลองชิม': 'long chim',
    'กำแพงเมืองจีน': 'kamphaeng mueang chin',
    'แม่น้ำแยงซี': 'mae nam yaengsi',
    'สนาม': 'sanam',
    'เกิน': 'koen',
    'นั่ง': 'nang',
    'สำเร็จ': 'samret',
    'กลายเป็น': 'klai pen',
    'ซื่อสัตย์': 'suesat',
    'ตกใจ': 'tokchai',
    'อีกครั้ง': 'ik khrang',
    'สูบบุหรี่': 'sup buri',
    'ออกเดินทาง': 'ok doenthang',
    'เกิด': 'koet',
    'ปรากฏ': 'prakot',
    'ห้องครัว': 'hong khrua',
    'แฟกซ์': 'faek',
    'หน้าต่าง': 'na tang',
    'คำศัพท์': 'kham sap',
    'เสมอมา': 'samoe ma',
    'สะเพร่า': 'saphrao',
    'เก็บ': 'kep',
    'ข้อผิดพลาด': 'kho phitphlat',
    'คำตอบ': 'kham top',
    'แต่งตัว': 'taeng tua',
    'รบกวน': 'ropkuan',
    'พิมพ์': 'phim',
    'ทักทาย': 'thakthai',
    'ลดราคา': 'lot rakha',
    'ฉีดยา': 'chit ya',
    'ประมาณ': 'praman',
    'สถานทูต': 'sathanthut',
    'หมอ': 'mo',
    'สวม': 'suam',
    'เป็น': 'pen',
    'ตอนนั้น': 'ton nan',
    'มีด': 'mit',
    'ไกด์': 'gaet',
    'กลับด้าน': 'klap dan',
    'ทุกที่': 'thuk thi',
    'ท้ายที่สุด': 'thai thi sut',
    'ต้อง': 'tong',
    'ภูมิใจ': 'phumchai',
    'บอร์ดดิ้งพาส': 'boarding pass',
    'ต่ำ': 'tam',
    'ด้านล่าง': 'dan lang',
    'สถานที่': 'sathan thi',
    'โลก': 'lok',
    'ที่อยู่': 'thi yu',
    'ตก': 'tok',
    'สำรวจ': 'samruat',
    'ทำหาย': 'tham hai',
    'การเคลื่อนไหว': 'kan khlueanwai',
    'รถติด': 'rot tit',
    'ท้อง': 'thong',
    'ข้อความสั้น': 'khokhwam san',
    'บทสนทนา': 'bot sonthana',
    'ตรงข้าม': 'trong kham',
    'สำหรับ': 'samrap',
    'เด็ก': 'dek',
    'เกิดขึ้น': 'koet khuen',
    'พัฒนา': 'phatthana',
    'กฎหมาย': 'kotmai',
    'แปลภาษา': 'plae phasa',
    'ความกังวล': 'khwam kangwon',
    'คัดค้าน': 'khatkhan',
    'วิธี': 'withi',
    'ด้าน': 'dan',
    'ทิศทาง': 'thitthang',
    'เจ้าของบ้าน': 'chao khong ban',
    'ยอมแพ้': 'yom phae',
    'ผ่อนคลาย': 'phonkhlai',
    'ฉบับ': 'chabap',
    'อุดมสมบูรณ์': 'udom sombun',
    'มิฉะนั้น': 'มิฉะนั้น',
    'สอดคล้อง': 'sotkhlong',
    'ชำระเงิน': 'chamra ngoen',
    'ครู': 'khru',
    'ให้': 'hai',
    'พวกเรา': 'phuak rao',
    'เรียน': 'rian',
    'คำว่า': 'kham wa',
  };

  if (wordMap[cleaned]) return wordMap[cleaned];

  return cleaned
    .split(' ')
    .map((word) => wordMap[word] || word)
    .join(' ')
    .trim();
}

function replaceField(block, fieldName, value) {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const regex = new RegExp(`"${fieldName}":\\s*"[^"]*"`);
  return block.replace(regex, `"${fieldName}": "${escaped}"`);
}

const raw = fs.readFileSync(inputPath, 'utf8');

const blocks = raw.match(/\{[\s\S]*?"category": "HSK4"\s*\}/g);
if (!blocks) {
  console.error('No HSK4 blocks found');
  process.exit(1);
}

let updated = raw;

for (const block of blocks) {
  const thMatch = block.match(/"th":\s*"([^"]*)"/);
  const sentenceThMatch = block.match(/"sentenceTh":\s*"([^"]*)"/);

  if (!thMatch || !sentenceThMatch) continue;

  const th = thMatch[1];
  const sentenceTh = sentenceThMatch[1];

  const thaiPronunciation = romanizeThai(th);
  const sentenceThaiPronunciation = romanizeThai(sentenceTh);

  let newBlock = block;
  newBlock = replaceField(newBlock, 'thaiPronunciation', thaiPronunciation);
  newBlock = replaceField(
    newBlock,
    'sentenceThaiPronunciation',
    sentenceThaiPronunciation
  );

  updated = updated.replace(block, newBlock);
}

fs.writeFileSync(outputPath, updated, 'utf8');
console.log('Updated hsk4-data.ts successfully');