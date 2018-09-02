import { Subject, merge, Subscriber, Subscription, fromEvent } from 'rxjs';
import { Socket, connect, ConnectOption } from './public_api';

export class SocketSubject<T> extends Subject<T> {
    socket: Socket;
    constructor(
        public url: string,
        public options?: ConnectOption
    ) {
        super();
    }
    next(value?: T): void {
        this.socket.send(value);
    }
    error(err: any): void {
        super.error(err);
    }
    complete(): void {
        this.socket.close();
        super.complete();
    }
    unsubscribe(): void {
        this.socket.close();
        super.unsubscribe();
    }
    _subscribe(subscriber: Subscriber<T>): Subscription {
        this.socket = connect(this.url, {});
        this.socket.onconnect = () => {
            this.socket.on('message', (data: T) => {
                super.next(data);
            });
            merge(
                fromEvent(this.socket, 'error'),
                fromEvent(this.socket, 'connect_error'),
                fromEvent(this.socket, 'reconnect_error'),
            ).subscribe(err => this.error(err));
            merge(
                fromEvent(this.socket, 'disconnect'),
                fromEvent(this.socket, 'connect_timeout'),
                fromEvent(this.socket, 'reconnect_failed'),
            ).subscribe(() => {
                this.complete();
            });
        }
        return super._subscribe(subscriber);
    }
}
