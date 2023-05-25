export type ICallback = (simTime: number) => void | Promise<void>;

interface ITimedEventEntry {
  time: number;
  callback: ICallback;
}

export class EventManager {
  private pendingEvents: ITimedEventEntry[] = [];
  private readonly eventPromises = new Set<Promise<void>>();
  private lastSimTime = 0;

  get timeToNextEvent() {
    if (this.pendingEvents.length === 0) {
      return -1;
    }
    return this.pendingEvents[0].time - this.lastSimTime;
  }

  get eventHandlersInProgress() {
    return Promise.all(this.eventPromises);
  }

  at(time: number, callback: ICallback) {
    this.pendingEvents.push({ time, callback });
    this.pendingEvents.sort((a, b) => a.time - b.time);
  }

  processEvents(time: number) {
    this.lastSimTime = time;
    const eventsToRun = this.pendingEvents.filter((event) => event.time <= time);
    this.pendingEvents = this.pendingEvents.filter((event) => event.time > time);
    for (const event of eventsToRun) {
      if (event.time <= time) {
        const promise = event.callback(time);
        if (promise && 'then' in promise) {
          this.eventPromises.add(promise);
          void promise.catch(() => {}).then(() => this.eventPromises.delete(promise));
        }
      }
    }
  }
}
