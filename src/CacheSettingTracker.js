
class CacheSettingTracker {
  constructor() {
    this.current = Promise.resolve();
    this.callback = () => {};
  }

  start() {
    this.current = new Promise((callback) => {
      this.callback = callback;
    });
  }

  complete() {
    this.callback();
    this.current = Promise.resolve();
  }
}

module.exports = CacheSettingTracker;
