"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("./url");
const manager_1 = require("./manager");
var parser = require('socket.io-parser');
var debug = require('debug')('socket.io-client');
exports.managers = {};
const cache = exports.managers;
exports.connect = (uri, opts) => {
    if (typeof uri === 'object') {
        opts = uri;
        uri = undefined;
    }
    opts = opts || {};
    const parsed = url_1.url(uri);
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id].nsps;
    const newConnection = opts.forceNew || opts['force new connection'] ||
        false === opts.multiplex || sameNamespace;
    let io;
    if (newConnection) {
        debug('ignoring socket cache for %s', source);
        io = new manager_1.Manager(source, opts);
    }
    else {
        if (!cache[id]) {
            debug('new io instance for %s', source);
            cache[id] = new manager_1.Manager(source, opts);
        }
        io = cache[id];
    }
    if (parsed.query && !opts.query) {
        opts.query = parsed.query;
    }
    return io.socket(parsed.path, opts);
};
exports.protocol = parser.protocol;
var manager_2 = require("./manager");
exports.Manager = manager_2.Manager;
var socket_1 = require("./socket");
exports.Socket = socket_1.Socket;
//# sourceMappingURL=public_api.js.map