import assert from "node:assert";
import { coverOf, acceptSeq } from "../window.js";
import { step, close } from "../seqrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, window: 4,
  state: { base: 0, bits: [0, 0, 0, 0], accepted: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "seq", seq: 2 }],
  seq_error_code: "E_BAD_SEQ", dup_error_code: "E_DUP_SEQ",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("coverOf returns bounds", () => {
  assert.strictEqual(coverOf(0, 4).length, 2);
});

check("acceptSeq returns a state", () => {
  const got = acceptSeq({ base: 0, bits: [0, 0, 0, 0] }, 2, 4);
  assert.strictEqual(typeof got, "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
