import test from 'node:test'
import assert from 'node:assert/strict'
import { HEXAGRAMS } from '../src/data/hexagrams.js'
import { getCoinsFromLineValue, getHexagramFromBits, getHexagramFromLines, getLineFromCoins, parseTestSequence } from '../src/utils/hexagram.js'

const GOLDEN_TRIGRAMS = {
  '000': '坤', '100': '震', '010': '坎', '110': '兑',
  '001': '艮', '101': '离', '011': '巽', '111': '乾',
}

const GOLDEN_HEXAGRAMS = [
  ['111111', 1, '乾'], ['000000', 2, '坤'], ['100010', 3, '屯'], ['010001', 4, '蒙'],
  ['111010', 5, '需'], ['010111', 6, '讼'], ['010000', 7, '师'], ['000010', 8, '比'],
  ['111011', 9, '小畜'], ['110111', 10, '履'], ['111000', 11, '泰'], ['000111', 12, '否'],
  ['101111', 13, '同人'], ['111101', 14, '大有'], ['001000', 15, '谦'], ['000100', 16, '豫'],
  ['100110', 17, '随'], ['011001', 18, '蛊'], ['110000', 19, '临'], ['000011', 20, '观'],
  ['100101', 21, '噬嗑'], ['101001', 22, '贲'], ['000001', 23, '剥'], ['100000', 24, '复'],
  ['100111', 25, '无妄'], ['111001', 26, '大畜'], ['100001', 27, '颐'], ['011110', 28, '大过'],
  ['010010', 29, '坎'], ['101101', 30, '离'], ['001110', 31, '咸'], ['011100', 32, '恒'],
  ['001111', 33, '遯'], ['111100', 34, '大壮'], ['000101', 35, '晋'], ['101000', 36, '明夷'],
  ['101011', 37, '家人'], ['110101', 38, '睽'], ['001010', 39, '蹇'], ['010100', 40, '解'],
  ['110001', 41, '损'], ['100011', 42, '益'], ['111110', 43, '夬'], ['011111', 44, '姤'],
  ['000110', 45, '萃'], ['011000', 46, '升'], ['010110', 47, '困'], ['011010', 48, '井'],
  ['101110', 49, '革'], ['011101', 50, '鼎'], ['100100', 51, '震'], ['001001', 52, '艮'],
  ['001011', 53, '渐'], ['110100', 54, '归妹'], ['101100', 55, '丰'], ['001101', 56, '旅'],
  ['011011', 57, '巽'], ['110110', 58, '兑'], ['010011', 59, '涣'], ['110010', 60, '节'],
  ['110011', 61, '中孚'], ['001100', 62, '小过'], ['101010', 63, '既济'], ['010101', 64, '未济'],
]

test('contains the authoritative 64-hexagram King Wen sequence', () => {
  assert.equal(HEXAGRAMS.length, 64)
  assert.deepEqual(HEXAGRAMS.slice(0, 4).map(({ number, name }) => [number, name]), [
    [1, '乾'], [2, '坤'], [3, '屯'], [4, '蒙'],
  ])
  assert.deepEqual(HEXAGRAMS.slice(-2).map(({ number, name }) => [number, name]), [
    [63, '既济'], [64, '未济'],
  ])
  assert.equal(new Set(HEXAGRAMS.map(({ bits }) => bits)).size, 64)
  assert.equal(HEXAGRAMS.every(({ symbol }) => symbol.length === 1), true)
})

test('maps the three-coin convention to the four line values', () => {
  assert.equal(getLineFromCoins(['character', 'character', 'character']).value, 6)
  assert.equal(getLineFromCoins(['character', 'character', 'back']).value, 7)
  assert.equal(getLineFromCoins(['character', 'back', 'back']).value, 8)
  assert.equal(getLineFromCoins(['back', 'back', 'back']).value, 9)
})

test('rejects invalid coin faces before calculating the line value', () => {
  assert.throws(() => getLineFromCoins(['back', 'back', 'xxx']), RangeError)
  assert.throws(() => getLineFromCoins(['character', 'back']), RangeError)
  assert.throws(() => getLineFromCoins(['character', 'back', null]), RangeError)
})

test('matches the independent eight-trigram golden mapping', () => {
  for (const [bits, name] of Object.entries(GOLDEN_TRIGRAMS)) {
    assert.equal(getHexagramFromBits(`${bits}${bits}`).lower.name, name)
    assert.equal(getHexagramFromBits(`${bits}${bits}`).upper.name, name)
  }
})

test('converts test line values into deterministic coin faces', () => {
  assert.deepEqual(getCoinsFromLineValue(6), ['character', 'character', 'character'])
  assert.equal(getLineFromCoins(getCoinsFromLineValue(7)).value, 7)
  assert.equal(getLineFromCoins(getCoinsFromLineValue(8)).value, 8)
  assert.deepEqual(getCoinsFromLineValue(9), ['back', 'back', 'back'])
})

test('parses exactly six online test line values from the route query', () => {
  assert.deepEqual(parseTestSequence('6,7,8,9,7,8'), [6, 7, 8, 9, 7, 8])
  assert.equal(parseTestSequence('6,7,8'), null)
  assert.equal(parseTestSequence('6,7,8,9,7,5'), null)
  assert.equal(parseTestSequence(''), null)
})

test('records the first cast as the bottom line and the sixth as the top line', () => {
  const result = getHexagramFromLines([7, 8, 7, 8, 7, 8])
  assert.equal(result.original.name, '既济')
  assert.equal(result.original.bits, '101010')
  assert.equal(result.transformed.name, '既济')
  assert.deepEqual(result.changingLines, [])
})

test('changes only old yin and old yang when producing the transformed hexagram', () => {
  const result = getHexagramFromLines([6, 7, 8, 9, 7, 8])
  assert.deepEqual(result.changingLines, [0, 3])
  assert.equal(result.original.bits, '010110')
  assert.equal(result.transformed.bits, '110010')
})

test('calculates 睽 to 讼 for the documented changing-line regression', () => {
  const result = getHexagramFromLines([9, 7, 8, 7, 6, 7])
  assert.equal(result.original.number, 38)
  assert.equal(result.original.name, '睽')
  assert.equal(result.original.bits, '110101')
  assert.equal(result.transformed.number, 6)
  assert.equal(result.transformed.name, '讼')
  assert.equal(result.transformed.bits, '010111')
  assert.deepEqual(result.changingLines, [0, 4])
})

test('matches the independent King Wen golden matrix for all 64 static hexagrams', () => {
  assert.equal(GOLDEN_HEXAGRAMS.length, 64)
  for (const [bits, number, name] of GOLDEN_HEXAGRAMS) {
    const result = getHexagramFromBits(bits)
    assert.equal(result.number, number, `wrong number for ${bits}`)
    assert.equal(result.name, name, `wrong name for ${bits}`)
    assert.equal(getHexagramFromLines([...bits].map((bit) => bit === '1' ? 7 : 8)).original.name, name)
  }
})

test('maps all-yang and all-yin lines to Qian and Kun', () => {
  assert.equal(getHexagramFromBits('111111').name, '乾')
  assert.equal(getHexagramFromBits('000000').name, '坤')
})

test('exhaustively validates all 4096 six-throw outcomes', () => {
  const lineValues = [6, 7, 8, 9]
  const pairKeys = new Set()
  const originalKeys = new Set()
  const transformedKeys = new Set()
  let outcomeCount = 0

  const visit = (sequence) => {
    if (sequence.length === 6) {
      const result = getHexagramFromLines(sequence)
      const originalKey = result.original.bits
      const transformedKey = result.transformed.bits
      const pairKey = `${originalKey}->${transformedKey}`

      assert.equal(result.lines.length, 6)
      assert.equal(result.changingLines.length, sequence.filter((value) => value === 6 || value === 9).length)
      assert.equal(pairKeys.has(pairKey), false, `duplicate outcome pair: ${pairKey}`)

      for (let index = 0; index < 6; index += 1) {
        const line = result.lines[index]
        const expectedBit = value => (value === 6 || value === 8 ? '0' : '1')
        const expectedTransformedBit = value => (value === 6 || value === 7 ? '1' : '0')
        assert.equal(line.bit, Number(expectedBit(sequence[index])))
        assert.equal(line.transformedBit, Number(expectedTransformedBit(sequence[index])))
      }

      pairKeys.add(pairKey)
      originalKeys.add(originalKey)
      transformedKeys.add(transformedKey)
      outcomeCount += 1
      return
    }

    for (const value of lineValues) visit([...sequence, value])
  }

  visit([])

  assert.equal(outcomeCount, 4 ** 6)
  assert.equal(pairKeys.size, 4096)
  assert.equal(originalKeys.size, 64)
  assert.equal(transformedKeys.size, 64)
})
