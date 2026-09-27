// window.js：窗口的推进与标记
function fail(code) {
  throw Object.assign(new Error(code), { code: code });
}

export function coverOf(base, size) {
  return [base, base + size - 1];
}

export function acceptSeq(state, seq, size) {
  if (!Number.isInteger(seq) || seq <= 0) {
    fail("E_BAD_SEQ");
  }
  const base = state.base;
  const bits = state.bits || [];
  const accepted = state.accepted || [];
  if (seq < base) {
    fail("E_DUP_SEQ");
  }
  if (seq <= base + size - 1) {
    const index = seq - base;
    if (bits[index]) {
      fail("E_DUP_SEQ");
    }
    const nextBits = bits.slice();
    nextBits[index] = 1;
    return Object.assign({}, state, { bits: nextBits, accepted: accepted.concat([seq]) });
  }
  const nextBits = new Array(size).fill(0);
  nextBits[size - 1] = 1;
  return Object.assign({}, state, {
    base: seq - size + 1,
    bits: nextBits,
    accepted: accepted.concat([seq])
  });
}
