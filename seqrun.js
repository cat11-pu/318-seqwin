// seqrun.js：按共享处理预算跑事件，用尽的连着压账；收尾不限预算清账
import { acceptSeq } from "./window.js";

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isPositiveInt(seq) {
  return Number.isInteger(seq) && seq >= 1;
}

function rowKey(row) {
  return String(row[0]) + "\u001f" + String(row[1]);
}

function cloneState(state) {
  return {
    base: state.base,
    bits: state.bits.slice(),
    accepted: state.accepted.slice(),
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    applied: state.applied.map(function (row) {
      return Array.isArray(row) ? row.slice() : row;
    })
  };
}

function applyRow(state, row, size) {
  const next = acceptSeq(state, row[1], size);
  state.base = next.base;
  state.bits = next.bits;
  state.accepted.push(row[1]);
  state.applied.push(row.slice());
}

// 先把新事件全部校验成 [kind, seq] 账行：结构错误 E_BAD_EVENT、
// 序号非正整数 E_BAD_SEQ，校验与预算无关，轮不到处理也照报。
function normalizeEvents(events) {
  const rows = [];
  for (const event of events) {
    if (event === null || typeof event !== "object" || event.kind !== "seq") {
      throw codedError("E_BAD_EVENT", "事件结构不合法：kind 必须是 \"seq\"");
    }
    if (!isPositiveInt(event.seq)) {
      throw codedError("E_BAD_SEQ", "序号必须是正整数，收到 " + String(event.seq));
    }
    rows.push([event.kind, event.seq]);
  }
  return rows;
}

export function step(spec) {
  const size = spec.window;
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const fresh = normalizeEvents(events);

  let remaining = Number.isInteger(spec.budget) ? spec.budget : 0;
  let served = 0;
  let judged = 0;
  const done = new Set(state.applied.map(rowKey));

  // FIFO：上轮压账排在新事件前面，预算共用。
  const queue = state.ledger.map(function (row) { return row.slice(); }).concat(fresh);
  const pending = [];
  for (const row of queue) {
    const key = rowKey(row);
    if (done.has(key)) {
      continue;
    }
    if (remaining > 0) {
      applyRow(state, row, size);
      done.add(key);
      remaining -= 1;
      served += 1;
    } else {
      pending.push(row.slice());
    }
    judged += 1;
  }
  state.ledger = pending;

  return {
    state: state,
    served: served,
    ledger_before: pending.length,
    ledger: pending.map(function (row) { return row.slice(); }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const size = spec.window;
  const state = cloneState(spec.state);
  const done = new Set(state.applied.map(rowKey));
  let catchup = 0;
  while (state.ledger.length > 0) {
    const row = state.ledger.shift();
    const key = rowKey(row);
    if (done.has(key)) {
      continue;
    }
    applyRow(state, row, size);
    done.add(key);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
