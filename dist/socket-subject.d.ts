import { Subject, Subscriber, Subscription } from 'rxjs';
import { Socket, ConnectOption } from './public_api';
export declare class SocketSubject<T> extends Subject<T> {
    url: string;
    options?: ConnectOption;
    socket: Socket;
    constructor(url: string, options?: ConnectOption);
    next(value?: T): void;
    error(err: any): void;
    complete(): void;
    unsubscribe(): void;
    _subscribe(subscriber: Subscriber<T>): Subscription;
}
