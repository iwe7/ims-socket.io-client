import { Socket } from './socket';
export declare const managers: {};
export declare type ConnectFunction = (uri: any, opts: any) => Socket;
export declare const connect: ConnectFunction;
export declare const protocol: any;
export { Manager } from './manager';
export { Socket } from './socket';
