import { describe, expect, it } from 'vitest';
import {
  MAX_PLAYERS as CLIENT_MAX_PLAYERS,
  MIN_PLAYERS as CLIENT_MIN_PLAYERS,
  clampNumPlayers as clampClientPlayers,
  getRoomOccupancy as getClientRoomOccupancy,
  getMinerCapacity,
  getMinerCount,
} from '../src/lib/roomConfig.js';
import {
  MAX_PLAYERS as API_MAX_PLAYERS,
  MIN_PLAYERS as API_MIN_PLAYERS,
  clampNumPlayers as clampApiPlayers,
  getRoomOccupancy as getApiRoomOccupancy,
} from '../api/roomConfig.js';

describe('room player capacity', () => {
  it('keeps client and API limits aligned at 2–30 players', () => {
    expect(CLIENT_MIN_PLAYERS).toBe(2);
    expect(API_MIN_PLAYERS).toBe(CLIENT_MIN_PLAYERS);
    expect(CLIENT_MAX_PLAYERS).toBe(30);
    expect(API_MAX_PLAYERS).toBe(CLIENT_MAX_PLAYERS);
  });

  it('clamps invalid and oversized room requests on both sides', () => {
    for (const clamp of [clampClientPlayers, clampApiPlayers]) {
      expect(clamp(1)).toBe(2);
      expect(clamp(30)).toBe(30);
      expect(clamp(31)).toBe(30);
      expect(clamp(10_000)).toBe(30);
      expect(clamp('invalid')).toBe(3);
    }
  });

  it('counts the host only when they actively play and always caps miners at 30', () => {
    const spectatorRoom = { numPlayers: 30, hostParticipates: false, players: Array(30) };
    const miningHostRoom = { numPlayers: 30, hostParticipates: true, players: Array(30) };

    for (const occupancy of [getClientRoomOccupancy, getApiRoomOccupancy]) {
      expect(occupancy(spectatorRoom)).toBe(30);
      expect(occupancy(miningHostRoom)).toBe(30);
    }

    expect(getMinerCount(spectatorRoom)).toBe(30);
    expect(getMinerCapacity(spectatorRoom)).toBe(30);
    expect(getMinerCount(miningHostRoom)).toBe(30);
    expect(getMinerCapacity(miningHostRoom)).toBe(30);
  });
});
