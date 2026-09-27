// seqrun.js：按处理预算处理并留账
import { acceptSeq } from "./window.js";

function fail(code) {
  throw Object.assign(new Error(code), { code: code });
}

function codes(spec) {
  return {
    seq: spec.seq_error_code || "E_BAD_SEQ",
    dup: spec.dup_error_code || "E_DUP_SEQ",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function validateEvent(event, spec) {
  const c = codes(spec);
  if (!event || typeof event !== "object" || event.kind !== "seq") {
    fail(c.event);
  }
  if (!Number.isInteger(event.seq) || event.seq <= 0) {
    fail(c.seq);
  }
}

function accept(state, seq, spec) {
  try {
    return acceptSeq(state, seq, spec.window);
  } catch (error) {
    const c = codes(spec);
    if (error && error.code === "E_BAD_SEQ") fail(c.seq);
    if (error && error.code === "E_DUP_SEQ") fail(c.dup);
    throw error;
  }
}

function freshState(state) {
  return {
    base: state.base,
    bits: state.bits.slice(),
    accepted: state.accepted.slice(),
    ledger: state.ledger.map(function (entry) { return entry.slice(); }),
    applied: state.applied.slice()
  };
}

export function step(spec) {
  const events = spec.events || [];
  let budget = spec.budget || 0;
  let current = freshState(spec.state);
  let served = 0;
  const rest = [];
  for (const entry of current.ledger) {
    if (budget > 0) {
      budget -= 1;
      current = accept(current, entry[1], spec);
      served += 1;
    } else {
      rest.push(entry);
    }
  }
  current.ledger = rest;
  for (const event of events) {
    validateEvent(event, spec);
    if (event.id !== undefined && current.applied.indexOf(event.id) !== -1) {
      continue;
    }
    if (event.id !== undefined) {
      current.applied.push(event.id);
    }
    if (budget > 0) {
      budget -= 1;
      current = accept(current, event.seq, spec);
      served += 1;
    } else {
      current.ledger.push([event.kind, event.seq]);
    }
  }
  return {
    state: current,
    served: served,
    ledger_before: current.ledger.length,
    ledger: current.ledger.map(function (entry) { return entry.slice(); }),
    judged: served,
    judged_bound: events.length + spec.state.ledger.length
  };
}

export function close(spec) {
  let current = freshState(spec.state);
  const pending = current.ledger;
  current.ledger = [];
  let catchup = 0;
  for (const entry of pending) {
    current = accept(current, entry[1], spec);
    catchup += 1;
  }
  return { state: current, catchup: catchup };
}
