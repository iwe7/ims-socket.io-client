import eio = require('engine.io-client');
import Backoff = require('backo2');
import Emitter = require('component-emitter');
import { Socket } from './socket';
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
    passphrase?: string;
    cert?: string;
    ca?: string | string[];
    ciphers?: string;
    rejectUnauthorized?: boolean;
    parser?: any;
}
export declare class Manager extends Emitter {
    opts?: ManagerOpts;
    nsps: {
        [namespace: string]: Socket;
    };
    subs: any;
    backoff: Backoff;
    _reconnectionDelay: any;
    _reconnectionDelayMax: any;
    _randomizationFactor: any;
    readyState: string;
    connecting: Socket[];
    lastPing: number;
    encoding: boolean;
    packetBuffer: any;
    encoder: any;
    decoder: any;
    autoConnect: boolean;
    engine: any;
    skipReconnect: boolean;
    _timeout: any;
    _reconnection: boolean;
    uri: string;
    constructor(uri: string | ManagerOpts, opts?: ManagerOpts);
    /**
     * Propagate given event to sockets and emit on `this`
     *
     * @api private
     */
    emitAll(...args: any[]): void;
    /**
     * Update `socket.id` of all sockets
     *
     * @api private
     */
    updateSocketIds(): void;
    generateId(nsp: string): string;
    reconnection(v: boolean): this | boolean;
    _reconnectionAttempts: any;
    reconnectionAttempts(v: number): this | number;
    reconnectionDelay(v?: number): number | this;
    randomizationFactor(v?: number): number | this;
    reconnectionDelayMax(v?: number): number | this;
    timeout(v?: number): this | number;
    reconnecting: any;
    private maybeReconnectOnOpen;
    open(fn?: (err?: any) => void): this;
    connect(fn?: (err?: any) => void): this;
    /**
     * Called upon transport open.
     *
     * @api private
     */
    onopen(): void;
    /**
     * Called upon a ping.
     *
     * @api private
     */
    onping(): void;
    /**
     * Called upon a packet.
     *
     * @api private
     */
    onpong(): void;
    /**
     * Called with data.
     *
     * @api private
     */
    ondata(data: any): void;
    /**
     * Called when parser fully decodes a packet.
     *
     * @api private
     */
    ondecoded(packet: any): void;
    /**
     * Called upon socket error.
     *
     * @api private
     */
    onerror(err: any): void;
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @api public
     */
    socket(nsp: string, opts: any): Socket;
    /**
     * Called upon a socket close.
     *
     * @param {Socket} socket
     */
    destroy(socket: any): void;
    /**
     * Writes a packet.
     *
     * @param {Object} packet
     * @api private
     */
    packet(packet: any): void;
    /**
     * If packet buffer is non-empty, begins encoding the
     * next packet in line.
     *
     * @api private
     */
    processPacketQueue(): void;
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @api private
     */
    cleanup(): void;
    /**
     * Close the current socket.
     *
     * @api private
     */
    close(): void;
    disconnect(): void;
    /**
     * Called upon engine close.
     *
     * @api private
     */
    onclose(reason: any): void;
    /**
     * Attempt a reconnection.
     *
     * @api private
     */
    reconnect(): this;
    /**
     * Called upon successful reconnect.
     *
     * @api private
     */
    onreconnect(): void;
}
