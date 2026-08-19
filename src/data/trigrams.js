/**
 * 八卦基础数据。
 *
 * bits 按“初爻 -> 上爻”存储：0 = 阴爻，1 = 阳爻。
 * 这是计算上下卦的内部规范，不能按视觉绘制顺序反向解释。
 */
export const TRIGRAMS = Object.freeze([
  { id: 'kun', name: '坤', symbol: '☷', natural: '地', bits: '000' },
  { id: 'zhen', name: '震', symbol: '☳', natural: '雷', bits: '100' },
  { id: 'kan', name: '坎', symbol: '☵', natural: '水', bits: '010' },
  { id: 'dui', name: '兑', symbol: '☱', natural: '泽', bits: '110' },
  { id: 'gen', name: '艮', symbol: '☶', natural: '山', bits: '001' },
  { id: 'li', name: '离', symbol: '☲', natural: '火', bits: '101' },
  { id: 'xun', name: '巽', symbol: '☴', natural: '风', bits: '011' },
  { id: 'qian', name: '乾', symbol: '☰', natural: '天', bits: '111' },
])

export const TRIGRAM_BY_BITS = Object.freeze(
  Object.fromEntries(TRIGRAMS.map((trigram) => [trigram.bits, trigram])),
)
