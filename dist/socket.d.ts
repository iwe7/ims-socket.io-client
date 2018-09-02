import { Manager } from './manager';
import Emitter = require('component-emitter');
/**
 * `Socket` constructor.
 *
 * @api public
 */
export declare class Socket extends Emitter {
    nsp?: string;
    json: Socket;
    id: string;
    ids: any;
    acks: any;
    receiveBuffer: any;
    sendBuffer: any;
    connected: boolean;
    disconnected: boolean;
    flags: any;
    query: any;
    io: Manager;
    constructor(io: Manager | string, nsp?: string, opts?: any);
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
    /**
     * Subscribe to open, close and packet events
     *
     * @api private
     */
    subs: any;
    subEvents(): void;
    open(): Socket;
    connect(): Socket;
    send(...args: any[]): this;
    emit(ev: string, ...args: any[]): boolean;
    packet(packet: any): void;
    onopen(): void;
    onclose(reason: any): void;
    onpacket(packet: any): void;
    onevent(packet: any): void;
    ack(id: any): () => void;
    private onack;
    onconnect(): void;
    emitBuffered(): void;
    private ondisconnect;
    destroy(): void;
    close(): Socket;
    disconnect(): Socket;
    compress(compress: boolean): Socket;
    binary(binary: any): this;
}
