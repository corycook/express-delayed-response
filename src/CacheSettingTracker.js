
class CacheSettingTracker {
  constructor() {
    this.current = Promise.resolve();
    this.onComplete = () => {};
  }

  start() {
    const previous = this.onComplete;
    this.current = new Promise((callback) => {
      this.onComplete = () => {
        previous();
        callback();
      };
    });
  }

  complete() {
    this.onComplete();
    this.current = Promise.resolve();
  }
}

module.exports = CacheSettingTracker;
