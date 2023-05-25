import { describe, expect, test, vi } from 'vitest';
import { EventManager } from './EventManager';

describe('EventManager', () => {
  test('No events scheduled', () => {
    const eventManager = new EventManager();
    expect(eventManager.timeToNextEvent).toBe(-1);
  });

  test('Scheduling of multiple events', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();
    const callback4 = vi.fn();
    const eventManager = new EventManager();

    eventManager.at(400, callback4);
    eventManager.at(100, callback1);
    eventManager.at(200, callback2);
    expect(eventManager.timeToNextEvent).toBe(100);

    eventManager.processEvents(150);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();
    expect(callback4).not.toHaveBeenCalled();
    expect(eventManager.timeToNextEvent).toBe(50);

    eventManager.at(300, callback3);
    eventManager.processEvents(280);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback3).not.toHaveBeenCalled();
    expect(callback4).not.toHaveBeenCalled();

    eventManager.processEvents(350);
    expect(callback3).toHaveBeenCalledTimes(1);
    expect(callback4).not.toHaveBeenCalled();

    eventManager.processEvents(400);
    expect(callback4).toHaveBeenCalledTimes(1);
    expect(eventManager.timeToNextEvent).toBe(-1);
  });
});
