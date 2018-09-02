import parseuri = require('parseuri');
import debug2 = require('debug');
const debug: debug2.IDebugger = debug2('socket.io-client:url');
import { global } from './global';
export interface Url {
  port: string;
  path: string;
  host: string;
  protocol: string;
  id: string;
  href: string;
  source: any;
  query: string;
}
export function url(uri: string, loc?: Location): Url {
  let obj: Url;
  loc = loc || global.location as Location;
  if (null == uri) uri = loc.protocol + '//' + loc.host;
  if ('string' === typeof uri) {
    if ('/' === uri.charAt(0)) {
      if ('/' === uri.charAt(1)) {
        uri = loc.protocol + uri;
      } else {
        uri = loc.host + uri;
      }
    }

    if (!/^(https?|wss?):\/\//.test(uri)) {
      debug('protocol-less url %s', uri);
      if ('undefined' !== typeof loc) {
        uri = loc.protocol + '//' + uri;
      } else {
        uri = 'https://' + uri;
      }
    }
    // parse
    debug('parse %s', uri);
    obj = parseuri(uri);
  }

  // make sure we treat `localhost:80` and `localhost` equally
  if (!obj.port) {
    if (/^(http|ws)$/.test(obj.protocol)) {
      obj.port = '80';
    } else if (/^(http|ws)s$/.test(obj.protocol)) {
      obj.port = '443';
    }
  }
  obj.path = obj.path || '/socket.io';
  var ipv6 = obj.host.indexOf(':') !== -1;
  var host = ipv6 ? '[' + obj.host + ']' : obj.host;
  // define unique id
  obj.id = obj.protocol + '://' + host + ':' + obj.port;
  // define href
  obj.href = obj.protocol + '://' + host + (loc && loc.port === obj.port ? '' : (':' + obj.port));
  return obj;
}
