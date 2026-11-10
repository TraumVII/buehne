export class HistoryStack {
  constructor(limit = 40) {
    this.limit = limit;
    this.stack = [];
    this.index = -1;
    this.restoring = false;
  }

  push(snapshot) {
    if (this.restoring) return;
    const json = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    if (this.stack[this.index] === json) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(json);
    if (this.stack.length > this.limit) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  undo() {
    if (!this.canUndo()) return null;
    this.index -= 1;
    return this.stack[this.index];
  }

  redo() {
    if (!this.canRedo()) return null;
    this.index += 1;
    return this.stack[this.index];
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index >= 0 && this.index < this.stack.length - 1;
  }

  clear() {
    this.stack = [];
    this.index = -1;
  }
}
