/**
 * Helper for subscriptions.
 *
 * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
 * @param {String} event name
 * @param {Function} callback
 * @api public
 */
export declare function on(obj: any, ev: any, fn: any): {
    destroy: () => void;
};
