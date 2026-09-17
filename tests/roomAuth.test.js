import { describe, expect, it } from 'vitest';
import { resolveRoomView } from '../src/lib/roomAuth.js';

function room(status, hostParticipates) {
  return { status, hostParticipates };
}

describe('host room routing', () => {
  it('uses the same dashboard while waiting for both host roles', () => {
    expect(resolveRoomView(room('waiting', false), { isHost: true, isPlayer: false })).toBe('host_dashboard');
    expect(resolveRoomView(room('waiting', true), { isHost: true, isPlayer: true })).toBe('host_dashboard');
  });

  it('opens the game only while a participating host is actively mining', () => {
    expect(resolveRoomView(room('playing', true), { isHost: true, isPlayer: true })).toBe('game');
    expect(resolveRoomView(room('playing', false), { isHost: true, isPlayer: false })).toBe('host_dashboard');
    expect(resolveRoomView(room('finished', true), { isHost: true, isPlayer: true })).toBe('host_dashboard');
  });
});
