"use strict";
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