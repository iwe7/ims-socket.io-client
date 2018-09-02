"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const public_api_1 = require("./public_api");
class SocketSubject extends rxjs_1.Subject {
    constructor(url, options) {
        super();
        this.url = url;
        this.options = options;
    }
    next(value) {
        this.socket.send(value);
    }
    error(err) {
        super.error(err);
    }
    complete() {
        this.socket.close();
        super.complete();
    }
    unsubscribe() {
        this.socket.close();
        super.unsubscribe();
    }
    _subscribe(subscriber) {
        this.socket = public_api_1.connect(this.url, {});
        this.socket.onconnect = () => {
            this.socket.on('message', (data) => {
                super.next(data);
            });
            rxjs_1.merge(rxjs_1.fromEvent(this.socket, 'error'), rxjs_1.fromEvent(this.socket, 'connect_error'), rxjs_1.fromEvent(this.socket, 'reconnect_error')).subscribe(err => this.error(err));
            rxjs_1.merge(rxjs_1.fromEvent(this.socket, 'disconnect'), rxjs_1.fromEvent(this.socket, 'connect_timeout'), rxjs_1.fromEvent(this.socket, 'reconnect_failed')).subscribe(() => {
                this.complete();
            });
        };
        return super._subscribe(subscriber);
    }
}
exports.SocketSubject = SocketSubject;
//# sourceMappingURL=socket-subject.js.map