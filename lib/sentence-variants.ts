import { pinyin } from 'pinyin-pro';
import { getThaiKaraoke } from '@/lib/thai-karaoke';

export type SentenceDifficulty = 'foundation' | 'applied' | 'challenge';

export type SentenceVariant = {
  id: string;
  label: string;
  difficulty: SentenceDifficulty;
  zh: string;
  th: string;
  pinyin?: string;
  thaiPronunciation?: string;
  en?: string;
};

export type SentenceVariantInput = {
  id: string;
  zh: string;
  pinyin?: string;
  th: string;
  sentenceZh?: string;
  sentencePinyin?: string;
  sentenceTh?: string;
  sentenceEn?: string;
  sentenceThaiPronunciation?: string;
  source: 'hsk4' | 'factory';
  category?: string;
  partOfSpeech?: string;
};

type SentenceSeed = {
  difficulty: SentenceDifficulty;
  label: string;
  zh: string;
  th: string;
  pinyin?: string;
  thaiPronunciation?: string;
  en?: string;
};

type UsageKind = 'verb' | 'adjective' | 'abstract' | 'concrete' | 'function';

function cleanText(text?: string) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function getPrimaryMeaning(text: string) {
  return cleanText(text.split('/')[0]?.split(',')[0]);
}

function looksGenericTrainingSentence(text?: string) {
  const normalized = cleanText(text);

  return (
    (normalized.includes('老师') && normalized.includes('这个词')) ||
    (normalized.includes('ครู') && normalized.includes('คำว่า'))
  );
}

function toSentencePinyin(text?: string) {
  const normalized = cleanText(text);

  if (!normalized) {
    return '';
  }

  return cleanText(
    pinyin(normalized)
      .replace(/\s+([，。！？；：])/g, '$1')
      .replace(/([，。！？；：])([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])/giu, '$1 $2')
  );
}

function dedupeVariants(variants: SentenceVariant[]) {
  const seen = new Set<string>();

  return variants.filter((variant) => {
    const key = `${cleanText(variant.zh)}::${cleanText(variant.th)}`;

    if (!variant.zh || !variant.th || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createVariant(
  input: SentenceVariantInput,
  difficulty: SentenceDifficulty,
  label: string,
  zh: string,
  th: string,
  extras?: Partial<Pick<SentenceVariant, 'pinyin' | 'thaiPronunciation' | 'en'>>
): SentenceVariant {
  const normalizedZh = cleanText(zh);

  return {
    id: `${input.id}-${difficulty}`,
    label,
    difficulty,
    zh: normalizedZh,
    th: cleanText(th),
    pinyin: cleanText(extras?.pinyin) || toSentencePinyin(normalizedZh),
    thaiPronunciation: getThaiKaraoke(th, extras?.thaiPronunciation),
    en: cleanText(extras?.en),
  };
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function guessUsageKind(input: SentenceVariantInput, meaning: string): UsageKind {
  const normalizedMeaning = cleanText(meaning);
  const pos = cleanText(input.partOfSpeech).toLowerCase();

  if (
    containsAny(normalizedMeaning, [
      'ตาม',
      'ตามที่',
      'ตรงเวลา',
      'เปอร์เซ็นต์',
      'ก่อน',
      'หลัง',
      'ระหว่าง',
      'เพื่อ',
      'โดย',
      'เกี่ยวกับ',
    ]) ||
    containsAny(pos, ['prep', 'conj', 'adv'])
  ) {
    return 'function';
  }

  if (
    normalizedMeaning.startsWith('ความ') ||
    normalizedMeaning.startsWith('การ') ||
    containsAny(normalizedMeaning, ['เปอร์เซ็นต์', 'ประสิทธิภาพ', 'ความรัก', 'ความปลอดภัย']) ||
    containsAny(pos, ['n.'])
  ) {
    return containsAny(normalizedMeaning, ['อุปกรณ์', 'เครื่อง', 'รถ', 'โทรศัพท์', 'ซาลาเปา'])
      ? 'concrete'
      : 'abstract';
  }

  if (
    containsAny(normalizedMeaning, [
      'ปลอดภัย',
      'ดี',
      'เก่ง',
      'ยอดเยี่ยม',
      'สะดวก',
      'ง่าย',
      'ยาก',
      'ชัดเจน',
      'สวย',
      'แพง',
      'ถูก',
      'สำคัญ',
      'พิเศษ',
    ]) ||
    containsAny(pos, ['adj'])
  ) {
    return 'adjective';
  }

  if (
    containsAny(normalizedMeaning, [
      'จัด',
      'วางแผน',
      'ทำ',
      'ไป',
      'มา',
      'ดู',
      'ฟัง',
      'พูด',
      'ซื้อ',
      'ขาย',
      'คิด',
      'รอ',
      'ช่วย',
      'บอก',
      'ใช้',
      'เรียน',
      'เปิด',
      'ปิด',
      'ปกป้อง',
      'ลด',
      'เพิ่ม',
      'ส่ง',
      'รับ',
      'ตรวจ',
      'เริ่ม',
      'หยุด',
    ]) ||
    containsAny(pos, ['v.'])
  ) {
    return 'verb';
  }

  return 'abstract';
}

function buildExactOverrides(input: SentenceVariantInput, meaning: string) {
  const overrides: Record<string, SentenceSeed[]> = {
    爱情: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '他们的爱情很稳定。',
        th: 'ความรักของพวกเขามั่นคงมาก',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '她最近常常跟我聊爱情。',
        th: 'ช่วงนี้เธอมักคุยเรื่องความรักกับฉัน',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '电影里的爱情故事让我很感动。',
        th: 'เรื่องราวความรักในหนังทำให้ฉันรู้สึกซาบซึ้งมาก',
      },
    ],
    安排: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '我已经把时间安排好了。',
        th: 'ฉันจัดเวลาเรียบร้อยแล้ว',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '我们先安排明天的行程吧。',
        th: 'พวกเรามาจัดตารางของวันพรุ่งนี้ก่อนเถอะ',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '如果临时有变化，我再重新安排。',
        th: 'ถ้ามีการเปลี่ยนแปลงกะทันหัน ฉันจะจัดใหม่อีกครั้ง',
      },
    ],
    安全: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '晚上回家要注意安全。',
        th: 'ตอนกลับบ้านตอนกลางคืนต้องระวังความปลอดภัย',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '这里很安全，你不用担心。',
        th: 'ที่นี่ปลอดภัยมาก คุณไม่ต้องกังวล',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '出门前先检查一下，这样更安全。',
        th: 'ก่อนออกจากบ้านลองตรวจดูอีกครั้ง แบบนี้จะปลอดภัยกว่า',
      },
    ],
    按时: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '他每天都按时到公司。',
        th: 'เขามาถึงบริษัทตรงเวลาทุกวัน',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '明天请按时来开会。',
        th: 'พรุ่งนี้กรุณามาประชุมให้ตรงเวลา',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '我们按时出发，就不会太赶。',
        th: 'ถ้าเราออกตรงเวลา ก็จะไม่รีบเกินไป',
      },
    ],
    按照: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '请按照这个步骤做。',
        th: 'กรุณาทำตามขั้นตอนนี้',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '你就按照我发的消息准备吧。',
        th: 'คุณเตรียมตามข้อความที่ฉันส่งได้เลย',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '如果有新通知，我们再按照最新安排调整。',
        th: 'ถ้ามีประกาศใหม่ เราค่อยปรับตามแผนล่าสุดอีกที',
      },
    ],
    百分之: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '这次考试我考了百分之八十。',
        th: 'ครั้งนี้ฉันสอบได้แปดสิบเปอร์เซ็นต์',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '这个月的目标已经完成百分之九十。',
        th: 'เป้าหมายของเดือนนี้สำเร็จไปแล้วเก้าสิบเปอร์เซ็นต์',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '如果能再提高百分之五，结果会更好。',
        th: 'ถ้าเพิ่มได้อีกห้าเปอร์เซ็นต์ ผลลัพธ์จะดีกว่านี้',
      },
    ],
    棒: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '你今天做得真棒。',
        th: 'วันนี้คุณทำได้ดีมากจริง ๆ',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '这家店的咖啡很棒。',
        th: 'กาแฟของร้านนี้อร่อยมาก',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '他第一次上台就表现得很棒。',
        th: 'เขาขึ้นเวทีครั้งแรกก็ทำได้ดีมาก',
      },
    ],
    包子: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '我早上买了两个包子。',
        th: 'ตอนเช้าฉันซื้อซาลาเปามาสองลูก',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '这家店的包子很好吃。',
        th: 'ซาลาเปาของร้านนี้อร่อยมาก',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '如果你还没吃饭，我们一起去买包子吧。',
        th: 'ถ้าคุณยังไม่ได้กินข้าว เราไปซื้อซาลาเปาด้วยกันเถอะ',
      },
    ],
    保护: [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: '出门的时候要保护好手机。',
        th: 'เวลาออกไปข้างนอกต้องดูแลโทรศัพท์ให้ดี',
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: '我们要保护孩子的安全。',
        th: 'พวกเราต้องปกป้องความปลอดภัยของเด็ก',
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: '她一直在努力保护自己的时间。',
        th: 'เธอพยายามปกป้องเวลาของตัวเองมาโดยตลอด',
      },
    ],
  };

  const matched = overrides[input.zh];

  if (!matched) {
    return null;
  }

  return matched.map((item) =>
    createVariant(input, item.difficulty, item.label, item.zh, item.th, {
      pinyin: item.pinyin,
      thaiPronunciation: item.thaiPronunciation,
      en: item.en,
    })
  );
}

function buildGenericDailySeeds(
  input: SentenceVariantInput,
  meaning: string,
  usageKind: UsageKind
): SentenceSeed[] {
  if (usageKind === 'function') {
    if (meaning.includes('ตรงเวลา')) {
      return [
        {
          difficulty: 'foundation',
          label: 'Daily',
          zh: '他今天按时到了。',
          th: 'วันนี้เขามาถึงตรงเวลา',
        },
        {
          difficulty: 'applied',
          label: 'Applied',
          zh: '明天请按时来找我。',
          th: 'พรุ่งนี้กรุณามาหาฉันให้ตรงเวลา',
        },
        {
          difficulty: 'challenge',
          label: 'Challenge',
          zh: '大家都按时出门，路上就不会太赶。',
          th: 'ถ้าทุกคนออกจากบ้านตรงเวลา ระหว่างทางก็จะไม่เร่งรีบเกินไป',
        },
      ];
    }

    if (meaning.includes('ตาม')) {
      return [
        {
          difficulty: 'foundation',
          label: 'Daily',
          zh: `请${input.zh}这个方法做。`,
          th: `กรุณาทำ${meaning}วิธีนี้`,
        },
        {
          difficulty: 'applied',
          label: 'Applied',
          zh: `你就${input.zh}上面的说明准备吧。`,
          th: `คุณเตรียมตามคำอธิบายข้างบนได้เลย`,
        },
        {
          difficulty: 'challenge',
          label: 'Challenge',
          zh: `如果老师有新的要求，我们再${input.zh}最新内容修改。`,
          th: `ถ้าครูมีข้อกำหนดใหม่ เราค่อยแก้ตามข้อมูลล่าสุดอีกครั้ง`,
        },
      ];
    }

    return [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: `我们先用${input.zh}的方式处理吧。`,
        th: `พวกเราลองจัดการด้วยวิธี${meaning}ก่อน`,
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: `你可以${input.zh}我的建议试试看。`,
        th: `คุณลองทำ${meaning}คำแนะนำของฉันดูก็ได้`,
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: `情况有变化的时候，我们要学会${input.zh}新规则调整。`,
        th: `เวลาสถานการณ์เปลี่ยน เราต้องรู้จักปรับตามกติกาใหม่`,
      },
    ];
  }

  if (usageKind === 'adjective') {
    return [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: `这里很${input.zh}。`,
        th: `ที่นี่${meaning}มาก`,
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: `今天的安排比昨天更${input.zh}。`,
        th: `การจัดการวันนี้${meaning}กว่าวานนี้`,
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: `如果这样做更${input.zh}，我们就按这个办法吧。`,
        th: `ถ้าทำแบบนี้แล้ว${meaning}กว่า เราก็ใช้วิธีนี้กันเถอะ`,
      },
    ];
  }

  if (usageKind === 'verb') {
    return [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: `这件事我来${input.zh}。`,
        th: `เรื่องนี้ฉันจะ${meaning}`,
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: `你先别急，我们一起${input.zh}。`,
        th: `คุณอย่าเพิ่งรีบ เรามา${meaning}ด้วยกันก่อน`,
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: `如果今天来不及，我们明天再${input.zh}。`,
        th: `ถ้าวันนี้ไม่ทัน พรุ่งนี้เราค่อย${meaning}กันอีกที`,
      },
    ];
  }

  if (usageKind === 'concrete') {
    return [
      {
        difficulty: 'foundation',
        label: 'Daily',
        zh: `我今天买了一个${input.zh}。`,
        th: `วันนี้ฉันซื้อ${meaning}หนึ่งชิ้น`,
      },
      {
        difficulty: 'applied',
        label: 'Applied',
        zh: `桌上那个${input.zh}是新的。`,
        th: `${meaning}บนโต๊ะอันนั้นเป็นของใหม่`,
      },
      {
        difficulty: 'challenge',
        label: 'Challenge',
        zh: `如果你需要${input.zh}，我可以先借给你。`,
        th: `ถ้าคุณต้องใช้${meaning} ฉันให้ยืมก่อนได้`,
      },
    ];
  }

  return [
    {
      difficulty: 'foundation',
      label: 'Daily',
      zh: `我觉得${input.zh}很重要。`,
      th: `ฉันคิดว่า${meaning}สำคัญมาก`,
    },
    {
      difficulty: 'applied',
      label: 'Applied',
      zh: `这件事跟${input.zh}有关系。`,
      th: `เรื่องนี้เกี่ยวข้องกับ${meaning}`,
    },
    {
      difficulty: 'challenge',
      label: 'Challenge',
      zh: `大家想法不一样，所以我们先谈谈${input.zh}。`,
      th: `ทุกคนคิดไม่เหมือนกัน งั้นเรามาคุยเรื่อง${meaning}ก่อน`,
    },
  ];
}

function buildHskVariants(input: SentenceVariantInput) {
  const meaning = getPrimaryMeaning(input.th) || cleanText(input.th);
  const variants: SentenceVariant[] = [];
  const exactOverrides = buildExactOverrides(input, meaning);

  if (input.sentenceZh && input.sentenceTh && !looksGenericTrainingSentence(input.sentenceZh)) {
    variants.push(
      createVariant(
        input,
        'foundation',
        'Daily',
        input.sentenceZh,
        input.sentenceTh,
        {
          pinyin: input.sentencePinyin,
          thaiPronunciation: input.sentenceThaiPronunciation,
          en: input.sentenceEn,
        }
      )
    );
  }

  if (exactOverrides) {
    variants.push(...exactOverrides);
    return dedupeVariants(variants);
  }

  const usageKind = guessUsageKind(input, meaning);

  variants.push(
    ...buildGenericDailySeeds(input, meaning, usageKind).map((seed) =>
      createVariant(input, seed.difficulty, seed.label, seed.zh, seed.th, {
        pinyin: seed.pinyin,
        thaiPronunciation: seed.thaiPronunciation,
        en: seed.en,
      })
    )
  );

  return dedupeVariants(variants);
}

function buildFactoryVariants(input: SentenceVariantInput) {
  const meaning = getPrimaryMeaning(input.th) || cleanText(input.th);
  const usageKind = guessUsageKind(input, meaning);
  const variants: SentenceVariant[] = [];

  if (input.sentenceZh && input.sentenceTh) {
    variants.push(
      createVariant(
        input,
        'foundation',
        'Daily',
        input.sentenceZh,
        input.sentenceTh,
        {
          pinyin: input.sentencePinyin,
          thaiPronunciation: input.sentenceThaiPronunciation,
          en: input.sentenceEn,
        }
      )
    );
  }

  const workplaceSeeds: SentenceSeed[] =
    usageKind === 'verb'
      ? [
          {
            difficulty: 'applied',
            label: 'Applied',
            zh: `这个问题我们先${input.zh}一下。`,
            th: `เรื่องนี้พวกเรามา${meaning}กันก่อน`,
          },
          {
            difficulty: 'challenge',
            label: 'Challenge',
            zh: `如果现场有变化，主管会马上${input.zh}新的安排。`,
            th: `ถ้าหน้างานมีการเปลี่ยนแปลง หัวหน้าจะ${meaning}แผนใหม่ทันที`,
          },
        ]
      : usageKind === 'adjective'
      ? [
          {
            difficulty: 'applied',
            label: 'Applied',
            zh: `现在这样更${input.zh}，大家做起来更顺。`,
            th: `ตอนนี้แบบนี้${meaning}กว่า ทุกคนทำงานได้ลื่นขึ้น`,
          },
          {
            difficulty: 'challenge',
            label: 'Challenge',
            zh: `如果流程再${input.zh}一点，交接会更快。`,
            th: `ถ้ากระบวนการ${meaning}ขึ้นอีกนิด การส่งต่องานจะเร็วขึ้น`,
          },
        ]
      : usageKind === 'concrete'
      ? [
          {
            difficulty: 'applied',
            label: 'Applied',
            zh: `请把${input.zh}放回原位。`,
            th: `กรุณานำ${meaning}กลับไปไว้ที่เดิม`,
          },
          {
            difficulty: 'challenge',
            label: 'Challenge',
            zh: `如果${input.zh}有问题，请马上告诉班长。`,
            th: `ถ้า${meaning}มีปัญหา กรุณาแจ้งหัวหน้ากะทันที`,
          },
        ]
      : [
          {
            difficulty: 'applied',
            label: 'Applied',
            zh: `今天的会议会先看${input.zh}。`,
            th: `การประชุมวันนี้จะดูเรื่อง${meaning}ก่อน`,
          },
          {
            difficulty: 'challenge',
            label: 'Challenge',
            zh: `如果${input.zh}再高一点，今天的结果会更好。`,
            th: `ถ้า${meaning}สูงขึ้นอีกหน่อย ผลลัพธ์ของวันนี้จะดีกว่านี้`,
          },
        ];

  variants.push(
    ...workplaceSeeds.map((seed) =>
      createVariant(input, seed.difficulty, seed.label, seed.zh, seed.th, {
        pinyin: seed.pinyin,
        thaiPronunciation: seed.thaiPronunciation,
        en: seed.en,
      })
    )
  );

  return dedupeVariants(variants);
}

export function buildSentenceVariants(input: SentenceVariantInput) {
  return input.source === 'factory' ? buildFactoryVariants(input) : buildHskVariants(input);
}

export function getPreferredSentenceVariant(
  variants: SentenceVariant[] | undefined,
  preferredDifficulty: SentenceDifficulty = 'applied'
) {
  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    variants.find((variant) => variant.difficulty === preferredDifficulty) || variants[0]
  );
}
