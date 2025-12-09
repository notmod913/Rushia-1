// Batch processor for database operations to reduce DB load
class BatchProcessor {
  constructor(batchSize = 100, flushInterval = 5000) {
    this.batches = new Map();
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    
    // Auto-flush every interval
    setInterval(() => this.flushAll(), flushInterval);
  }

  add(type, operation) {
    if (!this.batches.has(type)) {
      this.batches.set(type, []);
    }

    const batch = this.batches.get(type);
    batch.push(operation);

    if (batch.length >= this.batchSize) {
      this.flush(type);
    }
  }

  async flush(type) {
    const batch = this.batches.get(type);
    if (!batch || batch.length === 0) return;

    this.batches.set(type, []);

    try {
      await Promise.all(batch.map(op => op()));
    } catch (error) {
      console.error(`Batch flush error for ${type}:`, error);
    }
  }

  async flushAll() {
    for (const type of this.batches.keys()) {
      await this.flush(type);
    }
  }
}

module.exports = new BatchProcessor();
