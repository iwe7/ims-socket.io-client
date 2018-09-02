import { Manager } from './manager';
declare var Emitter: any;
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
    emit(ev: string, ...args: any[]): this;
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
export {};
