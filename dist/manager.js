"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eio = require("engine.io-client");
const socket_io_parser_1 = require("socket.io-parser");
const bind = require("component-bind");
const debug2 = require("debug");
const debug = debug2('socket.io-client:manager');
const indexOf = require("indexof");
const Backoff = require("backo2");
const Emitter = require("component-emitter");
const on_1 = require("./on");
const socket_1 = require("./socket");
const has = Object.prototype.hasOwnProperty;
class Manager extends Emitter {
    constructor(uri, opts) {
        super();
        this.opts = opts;
        this.nsps = {};
        this.readyState = 'closed';
        this.connecting = [];
        this.encoding = false;
        if (typeof uri === 'string') {
            this.uri = uri;
        }
        else {
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
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor(),
        });
        this.timeout(null == opts.timeout ? 20000 : opts.timeout);
        this.lastPing = null;
        this.packetBuffer = [];
        this.encoder = new socket_io_parser_1.Encoder();
        this.decoder = new socket_io_parser_1.Decoder();
        this.autoConnect = opts.autoConnect !== false;
        console.log(this.autoConnect);
        if (this.autoConnect)
            this.open();
    }
    /**
     * Propagate given event to sockets and emit on `this`
     *
     * @api private
     */
    emitAll(...args) {
        this.emit.apply(this, arguments);
        for (var nsp in this.nsps) {
            if (has.call(this.nsps, nsp)) {
                this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
            }
        }
    }
    ;
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
    }
    ;
    generateId(nsp) {
        return (nsp === '/' ? '' : (nsp + '#')) + this.engine.id;
    }
    reconnection(v) {
        if (!arguments.length)
            return this._reconnection;
        this._reconnection = !!v;
        return this;
    }
    reconnectionAttempts(v) {
        if (!arguments.length)
            return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
    }
    reconnectionDelay(v) {
        if (!arguments.length)
            return this._reconnectionDelay;
        this._reconnectionDelay = v;
        this.backoff && this.backoff.setMin(v);
        this._reconnectionDelay;
    }
    randomizationFactor(v) {
        if (!arguments.length)
            return this._randomizationFactor;
        this._randomizationFactor = v;
        this.backoff && this.backoff.setJitter(v);
        return this;
    }
    reconnectionDelayMax(v) {
        if (!arguments.length)
            return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        this.backoff && this.backoff.setMax(v);
        return this;
    }
    ;
    timeout(v) {
        if (!arguments.length)
            return this._timeout;
        this._timeout = v;
        return this;
    }
    maybeReconnectOnOpen() {
        // Only try to reconnect if it's the first time we're connecting
        if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
            // keeps reconnection from firing twice for the same reconnection loop
            this.reconnect();
        }
    }
    ;
    open(fn) {
        return this.connect(fn);
    }
    connect(fn) {
        debug('readyState %s', this.readyState);
        if (~this.readyState.indexOf('open'))
            return this;
        debug('opening %s', this.uri);
        this.engine = eio(this.uri, this.opts);
        var socket = this.engine;
        var self = this;
        this.readyState = 'opening';
        this.skipReconnect = false;
        var openSub = on_1.on(socket, 'open', function () {
            self.onopen();
            fn && fn();
        });
        var errorSub = on_1.on(socket, 'error', function (data) {
            debug('connect_error');
            self.cleanup();
            self.readyState = 'closed';
            self.emitAll('connect_error', data);
            if (fn) {
                var err = new Error('Connection error');
                err.message = data;
                fn(err);
            }
            else {
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
        this.subs.push(on_1.on(socket, 'data', bind(this, 'ondata')));
        this.subs.push(on_1.on(socket, 'ping', bind(this, 'onping')));
        this.subs.push(on_1.on(socket, 'pong', bind(this, 'onpong')));
        this.subs.push(on_1.on(socket, 'error', bind(this, 'onerror')));
        this.subs.push(on_1.on(socket, 'close', bind(this, 'onclose')));
        this.subs.push(on_1.on(this.decoder, 'decoded', bind(this, 'ondecoded')));
    }
    ;
    /**
     * Called upon a ping.
     *
     * @api private
     */
    onping() {
        this.lastPing = new Date().getTime();
        this.emitAll('ping');
    }
    ;
    /**
     * Called upon a packet.
     *
     * @api private
     */
    onpong() {
        const diff = new Date().getTime() - this.lastPing;
        this.emitAll('pong', diff);
    }
    ;
    /**
     * Called with data.
     *
     * @api private
     */
    ondata(data) {
        this.decoder.add(data);
    }
    ;
    /**
     * Called when parser fully decodes a packet.
     *
     * @api private
     */
    ondecoded(packet) {
        this.emit('packet', packet);
    }
    ;
    /**
     * Called upon socket error.
     *
     * @api private
     */
    onerror(err) {
        debug('error', err);
        this.emitAll('error', err);
    }
    ;
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @api public
     */
    socket(nsp, opts) {
        let socket = this.nsps[nsp];
        if (!socket) {
            socket = new socket_1.Socket(this, nsp, opts);
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
    }
    ;
    /**
     * Called upon a socket close.
     *
     * @param {Socket} socket
     */
    destroy(socket) {
        var index = indexOf(this.connecting, socket);
        if (~index)
            this.connecting.splice(index, 1);
        if (this.connecting.length)
            return;
        this.close();
    }
    ;
    /**
     * Writes a packet.
     *
     * @param {Object} packet
     * @api private
     */
    packet(packet) {
        debug('writing packet %j', packet);
        var self = this;
        if (packet.query && packet.type === 0)
            packet.nsp += '?' + packet.query;
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
        }
        else { // add packet to the queue
            self.packetBuffer.push(packet);
        }
    }
    ;
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
    }
    ;
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
    }
    ;
    /**
     * Close the current socket.
     *
     * @api private
     */
    close() {
        return this.disconnect();
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
        if (this.engine)
            this.engine.close();
    }
    ;
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
    }
    ;
    /**
     * Attempt a reconnection.
     *
     * @api private
     */
    reconnect() {
        if (this.reconnecting || this.skipReconnect)
            return this;
        var self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
            debug('reconnect failed');
            this.backoff.reset();
            this.emitAll('reconnect_failed');
            this.reconnecting = false;
        }
        else {
            var delay = this.backoff.duration();
            debug('will wait %dms before reconnect attempt', delay);
            this.reconnecting = true;
            var timer = setTimeout(function () {
                if (self.skipReconnect)
                    return;
                debug('attempting reconnect');
                self.emitAll('reconnect_attempt', self.backoff.attempts);
                self.emitAll('reconnecting', self.backoff.attempts);
                // check again for the case socket closed in above events
                if (self.skipReconnect)
                    return;
                self.open(function (err) {
                    if (err) {
                        debug('reconnect attempt error');
                        self.reconnecting = false;
                        self.reconnect();
                        self.emitAll('reconnect_error', err.data);
                    }
                    else {
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
        var attempt = this.backoff.attempts;
        this.reconnecting = false;
        this.backoff.reset();
        this.updateSocketIds();
        this.emitAll('reconnect', attempt);
    }
}
exports.Manager = Manager;
//# sourceMappingURL=manager.js.map