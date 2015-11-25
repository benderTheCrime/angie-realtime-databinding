/**
 * @module angie-binding.es6
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// System Modules
import                                          '../bower_components/MutationObserver/MutationObserver';

// Angie Binding Modules
import debounce from                            './util/debounce.es6';
import { default as AC } from                   './util/encryption.es6';

const w = window, d = w.document, bindings = w.angieBindings = {};

// Attach a script
const MUTATION_OBSERVER_OPTIONS = {
        childList: false,
        attributes: false,
        characterData: true,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: true
    };
let script = d.createElement('script'),
    stateValues = {},
    statePassphrases = {};

script.type = 'text/javascript';
script.src = './socket.io/socket.io.js';
script.onload = boot;

d.body.appendChild(script);

function boot() {
    const L = location,
        els = Array.from(d.querySelectorAll('*[ngie-iid]')),
        socket = io([ L.protocol, L.host ].join('//')),
        MUTATION_OBSERVER = new MutationObserver(
            observanceFn.bind(null, socket)
        );

    // Send all uuids, get back object with all data, one by one binding
    socket.on('connect', function() {
        socket.on('handshake', function() {
            socket.emit('a0001', els.map(
                v => v.getAttribute('ngie-iid')
            ));
        });

        socket.on('a0002', function(data) {

            // Start by disconnecting all of the mutation observers
            MUTATION_OBSERVER.disconnect();

            // Next set up all of the initial values
            for (let key in data) {
                const PASSPHRASE = data[ key ].passphrase,
                    VALUE = AC.decrypt(data[ key ].value, PASSPHRASE),

                    // Filter is better...you don't have to scan the whole
                    // document
                    EL = els.filter(
                        v => v.getAttribute('ngie-iid') === key
                    )[ 0 ];
                statePassphrases[ key ] = PASSPHRASE;
                setValue(EL, VALUE);
                stateValues[ key ] = VALUE;

                // Register callbacks on the window so that they can be
                // overriden by the user
                w.angieBindings[ key ] = {
                    callback: updateFn.bind(null, key),
                    error: errorFn.bind(null, key)
                };

                socket.on(`a0004::${key}`, data => {
                    w.angieBindings[ key ].callback(AC.decrypt(data.value, PASSPHRASE));
                });
                socket.on(`a0005::${key}`, e => {
                    w.angieBindings[ key ].error(e);
                });
            }

            // Bind an update event to each element
            // This only fires once in a page load, so it's ok
            for (let el of Array.from(els)) {
                let node = el.nodeName.toLowerCase();

                // TODO resolve for all elements, function
                    // TODO content editable
                    // TODO plain containers
                if (
                    [
                        'select', 'textarea', 'input', 'button'
                    ].indexOf(node) > -1
                ) {
                    let eName = 'keyup';
                    if (
                        node === 'select' ||
                        [ 'checkbox', 'radio' ].indexOf(el.type) > -1
                    ) {
                        eName = 'change';
                    }

                    // Add the input event
                    d.addEventListener(eName, debounce(
                        observanceFn.bind(el, socket), 250
                    ));
                } else {
                    MUTATION_OBSERVER.observe(el, MUTATION_OBSERVER_OPTIONS);
                }
            }

            socket.on(`a0005`, errorFn.bind(null, null));

            function updateFn(uuid, data) {
                const PASSPHRASE = statePassphrases[ uuid ],
                    VALUE = AC.decrypt(data.value, PASSPHRASE);

                setValue(d.querySelector(`*[ngie-iid="${uuid}"]`), VALUE);
                stateValues[ uuid ] = VALUE;

                return true;
            }

            function errorFn(uuid, data) {

                // Log our error
                console.error(data.message);

                setValue(d.querySelector(
                    `*[ngie-iid="${uuid}"]`), stateValues[ uuid ]
                );
            }
        });
    });
}

function observanceFn(socket, e) {

    // This will always be parentNode if its a character data mutation
    const EL = this || (e[ 0 ] && e[ 0 ].target.parentNode),
        UUID = EL.getAttribute('ngie-iid'),
        PASSPHRASE = statePassphrases[ UUID ],
        VALUE = getValue.call(EL);

    if (e && e[ 0 ]) {
        EL.innerHTML = VALUE;
    }

    socket.emit('a0003', {
        uuid: UUID,
        value: AC.encrypt(VALUE, PASSPHRASE),
        pre: AC.encrypt(stateValues[ UUID ], PASSPHRASE)
    });
}

function getValue(el) {
    el = el || this;

    return 'value' in el && $$value(el.value) ? el.value : el.innerHTML;
}

function setValue(el, v) {
    (el = el || this)[ 'value' in el ? 'value' :  'innerHTML' ] = v;

    return true;
}

function $$value(v) {
    const type = typeof v;

    switch (type) {
        case 'number':
            return !isNaN(v);
        case 'string':
            return v !== '';
        default:
            return v || v === false;
    }
}