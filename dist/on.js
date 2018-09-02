"use strict";
/**
 * Helper for subscriptions.
 *
 * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
 * @param {String} event name
 * @param {Function} callback
 * @api public
 */
Object.defineProperty(exports, "__esModule", { value: true });
function on(obj, ev, fn) {
    obj.on(ev, fn);
    return {
        destroy: function () {
            obj.removeListener(ev, fn);
        }
    };
}
exports.on = on;
//# sourceMappingURL=on.js.map