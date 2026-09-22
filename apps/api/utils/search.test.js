const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeRegex,
  normalizeSearchTerm,
  normalizeTextSearchTerm,
  MAX_SEARCH_TERM_LENGTH,
} = require('./search');

describe('escapeRegex', () => {
  it('escapes every regex metacharacter', () => {
    const escaped = escapeRegex('a.b*c?(d)[e]{f}^g$h|i\\j');
    assert.ok(new RegExp(escaped).test('a.b*c?(d)[e]{f}^g$h|i\\j'));
    // A literal '.' in the input must not match an unrelated character.
    assert.ok(!new RegExp(escapeRegex('a.b')).test('axb'));
  });
});

describe('normalizeSearchTerm ($regex callers, e.g. brand search)', () => {
  it('trims, caps length and escapes metacharacters', () => {
    const term = normalizeSearchTerm('  gift (large)  ');
    assert.equal(term, 'gift \\(large\\)');
  });

  it('caps at MAX_SEARCH_TERM_LENGTH', () => {
    const long = 'a'.repeat(MAX_SEARCH_TERM_LENGTH + 50);
    assert.equal(normalizeSearchTerm(long).length, MAX_SEARCH_TERM_LENGTH);
  });

  it('returns empty string for non-strings and blank input', () => {
    assert.equal(normalizeSearchTerm(undefined), '');
    assert.equal(normalizeSearchTerm('   '), '');
  });
});

describe('normalizeTextSearchTerm ($text callers, e.g. product search)', () => {
  it('trims and caps length WITHOUT escaping regex metacharacters', () => {
    // $text is not a regex; escaping would corrupt its own syntax
    // (quoted phrases, -exclusion) for no security benefit.
    assert.equal(normalizeTextSearchTerm('  gift (large)  '), 'gift (large)');
    assert.equal(normalizeTextSearchTerm('"gift set" -travel'), '"gift set" -travel');
  });

  it('caps at MAX_SEARCH_TERM_LENGTH', () => {
    const long = 'a'.repeat(MAX_SEARCH_TERM_LENGTH + 50);
    assert.equal(normalizeTextSearchTerm(long).length, MAX_SEARCH_TERM_LENGTH);
  });

  it('returns empty string for non-strings and blank input', () => {
    assert.equal(normalizeTextSearchTerm(undefined), '');
    assert.equal(normalizeTextSearchTerm('   '), '');
  });
});
