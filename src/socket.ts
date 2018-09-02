import { Manager, ManagerOpts } from './manager';

/**
 * Module dependencies.
 */

import parser = require('socket.io-parser');
import Emitter = require('component-emitter');
import toArray = require('to-array');
import { on } from './on';
import bind = require('component-bind');
import debug2 = require('debug');
const debug: debug2.IDebugger = debug2('socket.io-client:socket');
import parseqs = require('parseqs');
import hasBin = require('has-binary2');

/**
 * Internal events (blacklisted).
 * These events can't be emitted by the user.
 *
 * @api private
 */

var events = {
  connect: 1,
  connect_error: 1,
  connect_timeout: 1,
  connecting: 1,
  disconnect: 1,
  error: 1,
  reconnect: 1,
  reconnect_attempt: 1,
  reconnect_failed: 1,
  reconnect_error: 1,
  reconnecting: 1,
  ping: 1,
  pong: 1
};

/**
 * Shortcut to `Emitter#emit`.
 */

var emit = Emitter.prototype.emit;

/**
 * `Socket` constructor.
 *
 * @api public
 */

export class Socket extends Emitter {
  json: Socket;
  id: string;
  ids: any;
  acks: any;
  receiveBuffer: any;
  sendBuffer: any;
  connected: boolean = false;
  disconnected: boolean = true;
  flags: any;
  query: any;
  io: Manager;
  constructor(io: Manager | string, public nsp?: string, opts?: any) {
    super();
    if (typeof io === 'object') {
      this.io = io;
    }
    this.json = this; // compat
    this.ids = 0;
    this.acks = {};
    this.receiveBuffer = [];
    this.sendBuffer = [];
    this.flags = {};
    if (opts && opts.query) {
      this.query = opts.query;
    }
    if (this.io.autoConnect) this.open();
  }

  on(event: 'connect', listener: () => void): Emitter;
  on(event: 'connect_error', listener: (err: Error) => void): Emitter;
  on(event: 'connect_timeout', listener: () => void): Emitter;
  on(event: 'connecting', listener: (attempt: number) => void): Emitter;
  on(event: 'disconnect', listener: () => void): Emitter;
  on(event: 'error', listener: (err: Error) => void): Emitter;
  on(event: 'reconnect', listener: (attempt: number) => void): Emitter;
  on(event: 'reconnect_attempt', listener: () => void): Emitter;
  on(event: 'reconnect_failed', listener: () => void): Emitter;
  on(event: 'reconnect_error', listener: (err: Error) => void): Emitter;
  on(event: 'reconnecting', listener: (attempt: number) => void): Emitter;
  on(event: 'ping', listener: () => void): Emitter;
  on(event: 'pong', listener: () => void): Emitter;
  on(event: 'message', listener: (data: any) => void): Emitter;
  on(event: string, listener: Function): Emitter {
    return super.on(event, listener);
  }

  /**
   * Subscribe to open, close and packet events
   *
   * @api private
   */
  subs: any;
  subEvents() {
    if (this.subs) return;

    var io = this.io;
    this.subs = [
      on(io, 'open', bind(this, 'onopen')),
      on(io, 'packet', bind(this, 'onpacket')),
      on(io, 'close', bind(this, 'onclose'))
    ];
  }
  open(): Socket {
    return this.connect();
  }
  connect(): Socket {
    if (this.connected) return this;
    this.subEvents();
    this.io.open(); // ensure open
    if ('open' === this.io.readyState) this.onopen();
    this.emit('connecting');
    return this;
  }

  send(...args: any[]) {
    args.unshift('message');
    this.emit.apply(this, args);
    return this;
  }

  emit(ev: string, ...args: any[]): boolean {
    if (events.hasOwnProperty(ev)) {
      emit.apply(this, arguments);
      return true;
    }
    let packet: any = {
      type: (this.flags.binary !== undefined ? this.flags.binary : hasBin(args)) ? parser.BINARY_EVENT : parser.EVENT,
      data: args
    };
    packet.options = {};
    packet.options.compress = !this.flags || false !== this.flags.compress;
    if ('function' === typeof args[args.length - 1]) {
      debug('emitting packet with ack id %d', this.ids);
      this.acks[this.ids] = args.pop();
      packet.id = this.ids++;
    }
    if (this.connected) {
      this.packet(packet);
    } else {
      this.sendBuffer.push(packet);
    }
    this.flags = {};
    return true;
  }

  packet(packet) {
    packet.nsp = this.nsp;
    this.io.packet(packet);
  }

  onopen() {
    debug('transport is open - connecting');

    // write connect packet if necessary
    if ('/' !== this.nsp) {
      if (this.query) {
        var query = typeof this.query === 'object' ? parseqs.encode(this.query) : this.query;
        debug('sending connect packet with query %s', query);
        this.packet({ type: parser.CONNECT, query: query });
      } else {
        this.packet({ type: parser.CONNECT });
      }
    }
  }
  onclose(reason) {
    debug('close (%s)', reason);
    this.connected = false;
    this.disconnected = true;
    delete this.id;
    this.emit('disconnect', reason);
  }
  onpacket(packet) {
    var sameNamespace = packet.nsp === this.nsp;
    var rootNamespaceError = packet.type === parser.ERROR && packet.nsp === '/';

    if (!sameNamespace && !rootNamespaceError) return;

    switch (packet.type) {
      case parser.CONNECT:
        this.onconnect();
        break;

      case parser.EVENT:
        this.onevent(packet);
        break;

      case parser.BINARY_EVENT:
        this.onevent(packet);
        break;

      case parser.ACK:
        this.onack(packet);
        break;

      case parser.BINARY_ACK:
        this.onack(packet);
        break;

      case parser.DISCONNECT:
        this.ondisconnect();
        break;

      case parser.ERROR:
        this.emit('error', packet.data);
        break;
    }
  }
  onevent(packet) {
    var args = packet.data || [];
    debug('emitting event %j', args);

    if (null != packet.id) {
      debug('attaching ack callback to event');
      args.push(this.ack(packet.id));
    }

    if (this.connected) {
      emit.apply(this, args);
    } else {
      this.receiveBuffer.push(args);
    }
  }
  ack(id) {
    var self = this;
    var sent = false;
    return function () {
      // prevent double callbacks
      if (sent) return;
      sent = true;
      var args = toArray(arguments);
      debug('sending ack %j', args);

      self.packet({
        type: hasBin(args) ? parser.BINARY_ACK : parser.ACK,
        id: id,
        data: args
      });
    };
  }
  private onack(packet) {
    var ack = this.acks[packet.id];
    if ('function' === typeof ack) {
      debug('calling ack %s with %j', packet.id, packet.data);
      ack.apply(this, packet.data);
      delete this.acks[packet.id];
    } else {
      debug('bad ack %s', packet.id);
    }
  }
  onconnect() {
    this.connected = true;
    this.disconnected = false;
    this.emit('connect');
    this.emitBuffered();
  }
  emitBuffered() {
    var i;
    for (i = 0; i < this.receiveBuffer.length; i++) {
      emit.apply(this, this.receiveBuffer[i]);
    }
    this.receiveBuffer = [];

    for (i = 0; i < this.sendBuffer.length; i++) {
      this.packet(this.sendBuffer[i]);
    }
    this.sendBuffer = [];
  }
  private ondisconnect() {
    debug('server disconnect (%s)', this.nsp);
    this.destroy();
    this.onclose('io server disconnect');
  }
  destroy() {
    if (this.subs) {
      // clean subscriptions to avoid reconnections
      for (var i = 0; i < this.subs.length; i++) {
        this.subs[i].destroy();
      }
      this.subs = null;
    }
    this.io.destroy(this);
  }
  close(): Socket {
    return this.disconnect();
  }
  disconnect(): Socket {
    if (this.connected) {
      debug('performing disconnect (%s)', this.nsp);
      this.packet({ type: parser.DISCONNECT });
    }

    // remove socket from pool
    this.destroy();

    if (this.connected) {
      // fire events
      this.onclose('io client disconnect');
    }
    return this;
  }
  compress(compress: boolean): Socket {
    this.flags.compress = compress;
    return this;
  }

  binary(binary) {
    this.flags.binary = binary;
    return this;
  }

}
