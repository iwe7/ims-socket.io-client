import { ManagerOpts } from './manager';
import { Socket } from './socket';
export declare const managers: {};
export interface ConnectOption extends ManagerOpts {
}
export declare type ConnectFunction = (uri: string, opts: ConnectOption) => Socket;
export declare const connect: ConnectFunction;
export declare const protocol: any;
export { Manager } from './manager';
export { Socket } from './socket';
