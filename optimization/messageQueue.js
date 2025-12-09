// Message queue to prevent Discord rate limits when sending to multiple channels
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.delay = 1000; // 1 second between messages
  }

  add(task) {
    this.queue.push(task);
    if (!this.processing) {
      this.process();
    }
  }

  async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const task = this.queue.shift();

    try {
      await task();
    } catch (error) {
      console.error('Queue task error:', error);
    }

    setTimeout(() => this.process(), this.delay);
  }

  size() {
    return this.queue.length;
  }
}

module.exports = new MessageQueue();
