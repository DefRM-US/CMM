import { describe, expect, it } from 'vitest';
import {
  computeRequirementNumbers,
  editRequirementText,
  indentRequirement,
  moveRequirement,
  outdentRequirement,
  type Requirement,
  retireRequirement,
} from './index';

describe('Base Capability Matrix requirements', () => {
  it('computes display numbers from active Requirement order and level', () => {
    const requirements: Requirement[] = [
      {
        id: 'requirement-1',
        text: 'Provide secure hosting',
        level: 1,
        position: 0,
        retiredAt: null,
      },
      {
        id: 'requirement-2',
        text: 'Operate help desk',
        level: 2,
        position: 1,
        retiredAt: null,
      },
      {
        id: 'requirement-3',
        text: 'Retired draft row',
        level: 2,
        position: 2,
        retiredAt: '2026-05-01T10:00:00.000Z',
      },
      {
        id: 'requirement-4',
        text: 'Train operators',
        level: 1,
        position: 3,
        retiredAt: null,
      },
    ];

    expect(computeRequirementNumbers(requirements)).toEqual([
      {
        requirement: requirements[0],
        displayNumber: '1',
      },
      {
        requirement: requirements[1],
        displayNumber: '1.1',
      },
      {
        requirement: requirements[3],
        displayNumber: '2',
      },
    ]);

    expect(computeRequirementNumbers(requirements, { includeRetired: true })).toEqual([
      {
        requirement: requirements[0],
        displayNumber: '1',
      },
      {
        requirement: requirements[1],
        displayNumber: '1.1',
      },
      {
        requirement: requirements[2],
        displayNumber: '1.2',
      },
      {
        requirement: requirements[3],
        displayNumber: '2',
      },
    ]);
  });

  it('preserves Requirement identity across text, order, level, and retirement edits', () => {
    const requirements: Requirement[] = [
      {
        id: 'requirement-1',
        text: 'Provide secure hosting',
        level: 1,
        position: 0,
        retiredAt: null,
      },
      {
        id: 'requirement-2',
        text: 'Operate help desk',
        level: 1,
        position: 1,
        retiredAt: null,
      },
      {
        id: 'requirement-3',
        text: 'Train operators',
        level: 1,
        position: 2,
        retiredAt: null,
      },
    ];

    const edited = editRequirementText(requirements, 'requirement-2', 'Operate 24/7 help desk');
    expect(edited[1]).toMatchObject({
      id: 'requirement-2',
      text: 'Operate 24/7 help desk',
      position: 1,
    });

    const moved = moveRequirement(edited, 'requirement-3', 0);
    expect(moved.map((requirement) => requirement.id)).toEqual([
      'requirement-3',
      'requirement-1',
      'requirement-2',
    ]);
    expect(moved.map((requirement) => requirement.position)).toEqual([0, 1, 2]);

    const indented = indentRequirement(moved, 'requirement-1');
    expect(indented[1]).toMatchObject({
      id: 'requirement-1',
      level: 2,
      position: 1,
    });

    const outdented = outdentRequirement(indented, 'requirement-1');
    expect(outdented[1]).toMatchObject({
      id: 'requirement-1',
      level: 1,
      position: 1,
    });

    const retired = retireRequirement(outdented, 'requirement-1', '2026-05-01T10:00:00.000Z');
    expect(retired[1]).toMatchObject({
      id: 'requirement-1',
      level: 1,
      position: 1,
      retiredAt: '2026-05-01T10:00:00.000Z',
    });
  });
});
