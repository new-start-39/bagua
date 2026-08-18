import { HEXAGRAM_BY_BITS } from '../data/hexagrams.js'
import { TRIGRAM_BY_BITS } from '../data/trigrams.js'

export const COIN_VALUES = Object.freeze({ character: 2, back: 3 })

export const LINE_BY_VALUE = Object.freeze({
  6: Object.freeze({ value: 6, name: '老阴', yinYang: 'yin', changing: true, bit: 0, transformedBit: 1 }),
  7: Object.freeze({ value: 7, name: '少阳', yinYang: 'yang', changing: false, bit: 1, transformedBit: 1 }),
  8: Object.freeze({ value: 8, name: '少阴', yinYang: 'yin', changing: false, bit: 0, transformedBit: 0 }),
  9: Object.freeze({ value: 9, name: '老阳', yinYang: 'yang', changing: true, bit: 1, transformedBit: 0 }),
})

const assertLineValue = (value) => {
  if (!LINE_BY_VALUE[value]) throw new RangeError(`Line value must be 6, 7, 8 or 9; received ${value}`)
  return LINE_BY_VALUE[value]
}

export const getLineFromCoins = (coins) => {
  if (!Array.isArray(coins) || coins.length !== 3) throw new RangeError('Exactly three coins are required')
  const value = coins.reduce((sum, coin) => sum + (coin === 'character' ? COIN_VALUES.character : coin === 'back' ? COIN_VALUES.back : 0), 0)
  if (value < 6 || value > 9) throw new RangeError('Coins must contain only character or back')
  return { ...assertLineValue(value), coins: [...coins] }
}

export const getHexagramFromLines = (lines) => {
  if (!Array.isArray(lines) || lines.length !== 6) throw new RangeError('Exactly six lines are required')
  const normalized = lines.map((line) => assertLineValue(typeof line === 'number' ? line : line.value))
  const bits = normalized.map((line) => line.bit).join('')
  const transformedBits = normalized.map((line) => line.transformedBit).join('')
  const original = HEXAGRAM_BY_BITS[bits]
  const transformed = HEXAGRAM_BY_BITS[transformedBits]
  if (!original || !transformed) throw new Error('No hexagram matches the supplied lines')
  return {
    lines: normalized,
    changingLines: normalized
      .map((line, index) => (line.changing ? index : -1))
      .filter((index) => index !== -1),
    original,
    transformed,
  }
}

export const getHexagramFromBits = (bits) => {
  if (!/^[01]{6}$/.test(bits)) throw new RangeError('Hexagram bits must contain six 0/1 values')
  const lower = TRIGRAM_BY_BITS[bits.slice(0, 3)]
  const upper = TRIGRAM_BY_BITS[bits.slice(3)]
  if (!lower || !upper) throw new Error('No trigrams match the supplied bits')
  return HEXAGRAM_BY_BITS[bits]
}

