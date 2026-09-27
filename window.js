// window.js：窗口的覆盖、落窗标记与跳窗推进
export function coverOf(base, size) {
  return [base, base + size - 1];
}

function isPositiveInt(seq) {
  return Number.isInteger(seq) && seq >= 1;
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function acceptSeq(state, seq, size) {
  if (!isPositiveInt(seq)) {
    throw codedError("E_BAD_SEQ", "序号必须是正整数，收到 " + String(seq));
  }
  const base = state.base;
  const bits = state.bits.slice();
  const upper = base + size - 1;
  if (seq < base) {
    throw codedError("E_DUP_SEQ", "序号落后于窗口下界 " + base + "：" + seq);
  }
  if (seq <= upper) {
    const index = seq - base;
    if (bits[index]) {
      throw codedError("E_DUP_SEQ", "序号在当前窗口内已标记：" + seq);
    }
    bits[index] = 1;
    return Object.assign({}, state, { base: base, bits: bits });
  }
  const nextBase = seq - size + 1;
  const nextBits = new Array(size).fill(0);
  nextBits[size - 1] = 1;
  return Object.assign({}, state, { base: nextBase, bits: nextBits });
}
