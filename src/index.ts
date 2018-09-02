import { url, Url } from './url';
import { Manager, ManagerOpts } from './manager';
import { Socket } from './socket';

var parser = require('socket.io-parser');
var debug = require('debug')('socket.io-client');
export const managers = {};
const cache = managers;
export interface ConnectOption extends ManagerOpts { }
export type ConnectFunction = (uri: string, opts: ConnectOption) => Socket;
export const connect: ConnectFunction = (uri: string, opts: ConnectOption): Socket => {
  if (typeof uri === 'object') {
    opts = uri;
    uri = undefined;
  }
  opts = opts || {};
  const parsed: Url = url(uri);
  const source = parsed.source;
  const id = parsed.id;
  const path = parsed.path;
  const sameNamespace = cache[id] && path in cache[id].nsps;
  const newConnection = opts.forceNew || opts['force new connection'] ||
    false === opts.multiplex || sameNamespace;
  let io: Manager;
  if (newConnection) {
    debug('ignoring socket cache for %s', source);
    io = new Manager(source, opts);
  } else {
    if (!cache[id]) {
      debug('new io instance for %s', source);
      cache[id] = new Manager(source, opts);
    }
    io = cache[id];
  }
  if (parsed.query && !opts.query) {
    opts.query = parsed.query;
  }
  return io.socket(parsed.path, opts);
}
export const protocol = parser.protocol;
export { Manager } from './manager';
export { Socket } from './socket';
