import test from 'node:test';
import assert from 'node:assert/strict';
import { BANNER, renderMenu } from '../src/ui.js';

test('banner contains RPOW2 MINE ascii text', () => {
  assert.match(BANNER, /RPOW2/);
  assert.match(BANNER, /MINE/);
});

test('renderMenu contains login, automine, balance, and exit sections', () => {
  const menu = renderMenu();
  assert.match(menu, /Login with email/i);
  assert.match(menu, /Automine/i);
  assert.match(menu, /Check balance/i);
  assert.match(menu, /Exit/i);
});
