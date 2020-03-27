'use strict';

const { test } = require('tap');
const boa = require('../../');
const builtins = boa.builtins();

test('keyword arguments throws', t => {
  t.throws(() => boa.kwargs(false), TypeError);
  t.throws(() => boa.kwargs(true), TypeError);
  t.throws(() => boa.kwargs('foobar'), TypeError);
  t.throws(() => boa.kwargs(123), TypeError);
  t.end();
});

test('hash function', t => {
  t.ok(builtins.__hash__());
  t.equal(builtins['__notexists__'], undefined);

  const mlist = builtins.list([1, 3, 5]);
  mlist[0] = 2;
  mlist[1] = 4;
  t.strictEqual(mlist[0], 2);
  t.strictEqual(mlist[1], 4);
  t.end();
});

test('define a class extending python class', t => {
  class EmptyDict extends builtins.dict {
    constructor() {
      super([]);
      this.foobar = 10;
    }
  }
  const d = new EmptyDict();
  t.equal(builtins.type(d).__name__, 'dict');
  t.equal(d.foobar, 10);
  t.end();
});

test('define a class which is user-defined', t => {
  const pybasic = boa.import('tests.base.basic');
  class Foobar extends pybasic.Foobar {
    hellomsg(x) {
      return `hello <${x}> on ${this.test}`;
    }
  }
  const f = new Foobar();
  t.equal(f.test, 'pythonworld');
  t.equal(f.ping('yorkie'), 'hello <yorkie> on pythonworld');
  t.equal(f.callfunc(x => x * 2), 233 * 2);
  t.end();
});

test('with-statement normal flow', t => {
  const { open } = builtins;
  boa.with(open(__filename, 'r'), f => {
    console.log(f);
    t.pass();
    // no need to close because of `boa.with()`.
  }).then(() => {
    t.end();
  });
});

test('with-statement js exceptions', t => {
  const { open } = builtins;
  t.throws(() => boa.with({}), TypeError);
  t.throws(() => boa.with(open(__filename, 'r')), TypeError);
  t.end();
});

test('with-statement python exceptions', t => {
  const { Foobar } = boa.import('tests.base.basic');
  const mfoobar = new Foobar();
  boa.with(mfoobar, () => {
    t.equal(mfoobar.entered, true, 'foobar entered');
    // throw error
    mfoobar.hellomsg(233);
  });
  t.equal(mfoobar.exited, true, 'foobar exited');

  mfoobar.__exitcode__ = 1;
  boa.with(mfoobar, () => mfoobar.hellomsg(233))
    .catch(() => {
      t.end();
    });
});

test('iteration protocols', t => {
  const { range } = builtins;
  const [r0, r1,, r3] = range(0, 10);
  t.equal(r0[0], r0[1]);
  t.equal(r1[0], r1[1]);
  t.equal(r3[0], r3[1]);

  const [...iter] = range(0, 10);
  t.equal(iter.length, 10);

  const [i0, ...iter2] = range(0, 10);
  t.equal(i0[0], i0[1]);
  t.equal(iter2.length, 9);
  t.throws(() => {
    // eslint-disable-next-line no-unused-vars
    const [_] = builtins;
    // Should throw the error
  }, TypeError);
  t.end();
});