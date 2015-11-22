'use strict';

(function (w, d) {
    var MUTATION_OBSERVER = new MutationObserver(observeMe),
        MUTATION_OBSERVER_OPTIONS = {
        childList: false,
        attributes: true,
        characterData: true,
        subtree: false,
        attributeOldValue: true,
        characterDataOldValue: true
    };
    var script = d.createElement('script');

    script.type = 'text/javascript';
    script.src = './socket.io/socket.io.js';
    script.onload = boot;

    d.body.appendChild(script);

    function boot() {
        var L = location,
            els = Array.from(d.querySelectorAll('*[ngie-iid]')),
            socket = io([L.protocol, L.host].join('//'));

        socket.on('connect', function () {
            socket.on('handshake', function () {
                socket.emit('angie-bound-uuids', els.map(function (v) {
                    return v.getAttribute('ngie-iid');
                }));
            });

            socket.on('angie-bound-uuid-values', function (data) {
                MUTATION_OBSERVER.disconnect();

                var _loop = function (key) {
                    var VALUE = data[key],
                        EL = els.filter(function (v) {
                        return v.getAttribute('ngie-iid') === key;
                    })[0];
                    setValue(EL, VALUE);
                };

                for (var key in data) {
                    _loop(key);
                }

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = Array.from(els)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var el = _step.value;

                        var node = el.nodeName.toLowerCase();

                        if (['select', 'textarea', 'input', 'button'].indexOf(node) > -1) {
                            var eName = 'keyup';
                            if (node === 'select' || ['checkbox', 'radio'].indexOf(el.type) > -1) {
                                eName = 'change';
                            }
                            d.addEventListener(eName, observeMe.bind(el, socket));
                        } else {
                            MUTATION_OBSERVER.observe(el, MUTATION_OBSERVER_OPTIONS);
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                socket.on('angie-bound-uuid-post', function (data) {
                    return setValue(d.querySelector('*[ngie-iid="' + data.uuid + '"]'), data.value);
                });
            });

            socket.on('angie-socket-error', function (e) {
                throw new Error(e);
            });
        });
    }

    function observeMe(socket, e) {
        socket.emit('angie-bound-uuid', {
            uuid: this.getAttribute('ngie-iid'),
            value: getValue.call(this),

            pre: 'd'
        });
    }

    function getValue(el) {
        el = el || this;

        return 'value' in el && $$value(el.value) ? el.value : el.innerHTML;
    }

    function setValue(el, v) {
        (el = el || this)['value' in el ? 'value' : 'innerHTML'] = v;

        return true;
    }

    function $$value(v) {
        var type = typeof v;

        switch (type) {
            case 'number':
                return !isNaN(v);
            case 'string':
                return v !== '';
            default:
                return v || v === false;
        }
    }
})(window, document);