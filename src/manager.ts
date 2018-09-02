import eio = require('engine.io-client');
import parser = require('socket.io-parser');
import bind = require('component-bind');
import debug2 = require('debug');
const debug: debug2.IDebugger = debug2('socket.io-client:manager');
import indexOf = require('indexof');
import Backoff = require('backo2');
import Emitter = require('component-emitter');
import { on } from './on';
import { Socket } from './socket';

const has = Object.prototype.hasOwnProperty;
export interface ManagerOpts extends eio.SocketOptions {
  forceNew?: boolean;
  multiplex?: boolean;
  path?: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  randomizationFactor?: number;
  timeout?: number;
  autoConnect?: boolean;
  host?: string;
  hostname?: string;
  secure?: boolean;
  port?: string;
  query?: Object;
  upgrade?: boolean;
  forceJSONP?: boolean;
  jsonp?: boolean;
  forceBase64?: boolean;
  enablesXDR?: boolean;
  timestampParam?: string;
  timestampRequests?: boolean;
  policyPost?: number;
  rememberUpgrade?: boolean;
  onlyBinaryUpgrades?: boolean;
  pfx?: string;
  key?: string;
  passphrase?: string
  cert?: string;
  ca?: string | string[];
  ciphers?: string;
  rejectUnauthorized?: boolean;
  parser?: any;
}
export class Manager extends Emitter {
  nsps: { [namespace: string]: Socket } = {};
  subs: any;
  backoff: Backoff;
  _reconnectionDelay: any;
  _reconnectionDelayMax: any;
  _randomizationFactor: any;
  readyState: string = 'closed';
  connecting: Socket[] = [];
  lastPing: number;
  encoding: boolean = false;
  packetBuffer: any;
  encoder: any;
  decoder: any;
  autoConnect: boolean;
  engine: any;
  skipReconnect: boolean;
  _timeout: any;
  _reconnection: boolean;
  uri: string;
  constructor(uri: string | ManagerOpts, public opts?: ManagerOpts) {
    super();
    if (typeof uri === 'string') {
      this.uri = uri;
    } else {
      opts = uri;
      uri = undefined;
    }
    this.opts = this.opts || {};
    this.opts.path = this.opts.path || '/socket.io';

    this.nsps = {};
    this.subs = [];
    this.reconnection(opts.reconnection !== false);
    this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
    this.reconnectionDelay(opts.reconnectionDelay || 1000);
    this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
    this.randomizationFactor(opts.randomizationFactor || 0.5);
    this.backoff = new Backoff({
      min: this.reconnectionDelay() as any,
      max: this.reconnectionDelayMax() as any,
      jitter: this.randomizationFactor() as any,
    });
    this.timeout(null == opts.timeout ? 20000 : opts.timeout);
    this.lastPing = null;
    this.packetBuffer = [];
    var _parser = opts.parser || parser;
    this.encoder = new _parser.Encoder();
    this.decoder = new _parser.Decoder();
    this.autoConnect = opts.autoConnect !== false;
    console.log(this.autoConnect);
    if (this.autoConnect) this.open();
  }


  /**
   * Propagate given event to sockets and emit on `this`
   *
   * @api private
   */

  emitAll(...args: any[]) {
    this.emit.apply(this, arguments);
    for (var nsp in this.nsps) {
      if (has.call(this.nsps, nsp)) {
        this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
      }
    }
  };

  /**
   * Update `socket.id` of all sockets
   *
   * @api private
   */

  updateSocketIds() {
    for (var nsp in this.nsps) {
      if (has.call(this.nsps, nsp)) {
        this.nsps[nsp].id = this.generateId(nsp);
      }
    }
  };

  generateId(nsp: string) {
    return (nsp === '/' ? '' : (nsp + '#')) + this.engine.id;
  }

  reconnection(v: boolean): this | boolean {
    if (!arguments.length) return this._reconnection;
    this._reconnection = !!v;
    return this;
  }

  _reconnectionAttempts: any;
  reconnectionAttempts(v: number): this | number {
    if (!arguments.length) return this._reconnectionAttempts;
    this._reconnectionAttempts = v;
    return this;
  }

  reconnectionDelay(v?: number): number | this {
    if (!arguments.length) return this._reconnectionDelay;
    this._reconnectionDelay = v;
    this.backoff && this.backoff.setMin(v);
    this._reconnectionDelay
  }

  randomizationFactor(v?: number): number | this {
    if (!arguments.length) return this._randomizationFactor;
    this._randomizationFactor = v;
    this.backoff && this.backoff.setJitter(v);
    return this;
  }

  reconnectionDelayMax(v?: number): number | this {
    if (!arguments.length) return this._reconnectionDelayMax;
    this._reconnectionDelayMax = v;
    this.backoff && this.backoff.setMax(v);
    return this;
  };

  timeout(v?: number): this | number {
    if (!arguments.length) return this._timeout;
    this._timeout = v;
    return this;
  }

  reconnecting: any;
  private maybeReconnectOnOpen() {
    // Only try to reconnect if it's the first time we're connecting
    if (!this.reconnecting && this._reconnection && (<any>this.backoff).attempts === 0) {
      // keeps reconnection from firing twice for the same reconnection loop
      this.reconnect();
    }
  };

  open(fn?: (err?: any) => void): this {
    return this.connect(fn);
  }

  connect(fn?: (err?: any) => void): this {
    debug('readyState %s', this.readyState);
    if (~this.readyState.indexOf('open')) return this;
    debug('opening %s', this.uri);
    this.engine = eio(this.uri, this.opts);
    var socket = this.engine;
    var self = this;
    this.readyState = 'opening';
    this.skipReconnect = false;
    var openSub = on(socket, 'open', function () {
      self.onopen();
      fn && fn();
    });
    var errorSub = on(socket, 'error', function (data) {
      debug('connect_error');
      self.cleanup();
      self.readyState = 'closed';
      self.emitAll('connect_error', data);
      if (fn) {
        var err = new Error('Connection error');
        err.message = data;
        fn(err);
      } else {
        self.maybeReconnectOnOpen();
      }
    });
    if (false !== this._timeout) {
      var timeout = this._timeout;
      debug('connect attempt will timeout after %d', timeout);
      var timer = setTimeout(function () {
        debug('connect attempt timed out after %d', timeout);
        openSub.destroy();
        socket.close();
        socket.emit('error', 'timeout');
        self.emitAll('connect_timeout', timeout);
      }, timeout);
      this.subs.push({
        destroy: function () {
          clearTimeout(timer);
        }
      });
    }
    this.subs.push(openSub);
    this.subs.push(errorSub);
    return this;
  }

  /**
   * Called upon transport open.
   *
   * @api private
   */

  onopen() {
    debug('open');

    // clear old subs
    this.cleanup();

    // mark as open
    this.readyState = 'open';
    this.emit('open');

    // add new subs
    var socket = this.engine;
    this.subs.push(on(socket, 'data', bind(this, 'ondata')));
    this.subs.push(on(socket, 'ping', bind(this, 'onping')));
    this.subs.push(on(socket, 'pong', bind(this, 'onpong')));
    this.subs.push(on(socket, 'error', bind(this, 'onerror')));
    this.subs.push(on(socket, 'close', bind(this, 'onclose')));
    this.subs.push(on(this.decoder, 'decoded', bind(this, 'ondecoded')));
  };

  /**
   * Called upon a ping.
   *
   * @api private
   */

  onping() {
    this.lastPing = new Date().getTime();
    this.emitAll('ping');
  };

  /**
   * Called upon a packet.
   *
   * @api private
   */

  onpong() {
    const diff = new Date().getTime() - this.lastPing;
    this.emitAll('pong', diff);
  };

  /**
   * Called with data.
   *
   * @api private
   */

  ondata(data) {
    this.decoder.add(data);
  };

  /**
   * Called when parser fully decodes a packet.
   *
   * @api private
   */

  ondecoded(packet) {
    this.emit('packet', packet);
  };

  /**
   * Called upon socket error.
   *
   * @api private
   */

  onerror(err) {
    debug('error', err);
    this.emitAll('error', err);
  };

  /**
   * Creates a new socket for the given `nsp`.
   *
   * @return {Socket}
   * @api public
   */

  socket(nsp: string, opts): Socket {
    let socket = this.nsps[nsp];
    if (!socket) {
      socket = new Socket(this, nsp, opts);
      this.nsps[nsp] = socket;
      socket.on('connecting', () => {
        console.log('onConnecting');
        if (!~indexOf(this.connecting, socket)) {
          this.connecting.push(socket);
          console.log(this.connecting);
        }
      });
      socket.on('connect', () => {
        socket.id = this.generateId(nsp);
      });
    }
    return socket;
  };

  /**
   * Called upon a socket close.
   *
   * @param {Socket} socket
   */

  destroy(socket) {
    var index = indexOf(this.connecting, socket);
    if (~index) this.connecting.splice(index, 1);
    if (this.connecting.length) return;

    this.close();
  };

  /**
   * Writes a packet.
   *
   * @param {Object} packet
   * @api private
   */

  packet(packet) {
    debug('writing packet %j', packet);
    var self = this;
    if (packet.query && packet.type === 0) packet.nsp += '?' + packet.query;

    if (!self.encoding) {
      // encode, then write to engine with result
      self.encoding = true;
      this.encoder.encode(packet, function (encodedPackets) {
        for (var i = 0; i < encodedPackets.length; i++) {
          self.engine.write(encodedPackets[i], packet.options);
        }
        self.encoding = false;
        self.processPacketQueue();
      });
    } else { // add packet to the queue
      self.packetBuffer.push(packet);
    }
  };

  /**
   * If packet buffer is non-empty, begins encoding the
   * next packet in line.
   *
   * @api private
   */

  processPacketQueue() {
    if (this.packetBuffer.length > 0 && !this.encoding) {
      var pack = this.packetBuffer.shift();
      this.packet(pack);
    }
  };

  /**
   * Clean up transport subscriptions and packet buffer.
   *
   * @api private
   */

  cleanup() {
    debug('cleanup');

    var subsLength = this.subs.length;
    for (var i = 0; i < subsLength; i++) {
      var sub = this.subs.shift();
      sub.destroy();
    }

    this.packetBuffer = [];
    this.encoding = false;
    this.lastPing = null;

    this.decoder.destroy();
  };

  /**
   * Close the current socket.
   *
   * @api private
   */
  close() {
    return this.disconnect()
  }
  disconnect() {
    debug('disconnect');
    this.skipReconnect = true;
    this.reconnecting = false;
    if ('opening' === this.readyState) {
      // `onclose` will not fire because
      // an open event never happened
      this.cleanup();
    }
    this.backoff.reset();
    this.readyState = 'closed';
    if (this.engine) this.engine.close();
  };

  /**
   * Called upon engine close.
   *
   * @api private
   */

  onclose(reason) {
    debug('onclose');

    this.cleanup();
    this.backoff.reset();
    this.readyState = 'closed';
    this.emit('close', reason);

    if (this._reconnection && !this.skipReconnect) {
      this.reconnect();
    }
  };

  /**
   * Attempt a reconnection.
   *
   * @api private
   */

  reconnect() {
    if (this.reconnecting || this.skipReconnect) return this;
    var self = this;
    if ((<any>this.backoff).attempts >= this._reconnectionAttempts) {
      debug('reconnect failed');
      this.backoff.reset();
      this.emitAll('reconnect_failed');
      this.reconnecting = false;
    } else {
      var delay = this.backoff.duration();
      debug('will wait %dms before reconnect attempt', delay);

      this.reconnecting = true;
      var timer = setTimeout(function () {
        if (self.skipReconnect) return;

        debug('attempting reconnect');
        self.emitAll('reconnect_attempt', (<any>self.backoff).attempts);
        self.emitAll('reconnecting', (<any>self.backoff).attempts);

        // check again for the case socket closed in above events
        if (self.skipReconnect) return;

        self.open(function (err) {
          if (err) {
            debug('reconnect attempt error');
            self.reconnecting = false;
            self.reconnect();
            self.emitAll('reconnect_error', err.data);
          } else {
            debug('reconnect success');
            self.onreconnect();
          }
        });
      }, delay);

      this.subs.push({
        destroy: function () {
          clearTimeout(timer);
        }
      });
    }
  }

  /**
   * Called upon successful reconnect.
   *
   * @api private
   */
  onreconnect() {
    var attempt = (<any>this.backoff).attempts;
    this.reconnecting = false;
    this.backoff.reset();
    this.updateSocketIds();
    this.emitAll('reconnect', attempt);
  }
}
