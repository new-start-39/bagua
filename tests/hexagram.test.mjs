import test from 'node:test'
import assert from 'node:assert/strict'
import { HEXAGRAMS } from '../src/data/hexagrams.js'
import { getCoinsFromLineValue, getHexagramFromBits, getHexagramFromLines, getLineFromCoins, parseTestSequence } from '../src/utils/hexagram.js'

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

test('converts test line values into deterministic coin faces', () => {
  assert.deepEqual(getCoinsFromLineValue(6), ['character', 'character', 'character'])
  assert.equal(getLineFromCoins(getCoinsFromLineValue(7)).value, 7)
  assert.equal(getLineFromCoins(getCoinsFromLineValue(8)).value, 8)
  assert.deepEqual(getCoinsFromLineValue(9), ['back', 'back', 'back'])
})

test('parses exactly six online test line values from the hash', () => {
  assert.deepEqual(parseTestSequence('#test=6,7,8,9,7,8'), [6, 7, 8, 9, 7, 8])
  assert.equal(parseTestSequence('#test=6,7,8'), null)
  assert.equal(parseTestSequence('#test=6,7,8,9,7,5'), null)
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

test('maps all-yang and all-yin lines to Qian and Kun', () => {
  assert.equal(getHexagramFromBits('111111').name, '乾')
  assert.equal(getHexagramFromBits('000000').name, '坤')
})
