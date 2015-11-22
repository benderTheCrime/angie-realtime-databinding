/**
 * @module angie-binding.es6
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// System Modules
import '../bower_components/MutationObserver/MutationObserver';

// Angie Binding Modules
import debounce from        './util/debounce.es6';

const w = window, d = w.document;

// Attach a script
const MUTATION_OBSERVER = new MutationObserver(observeMe),
    MUTATION_OBSERVER_OPTIONS = {
        childList: false,
        attributes: true,
        characterData: true,
        subtree: false,
        attributeOldValue: true,
        characterDataOldValue: true
    };
let script = d.createElement('script'),
    stateValues = {};

script.type = 'text/javascript';
script.src = './socket.io/socket.io.js';
script.onload = boot;

d.body.appendChild(script);

function boot() {
    const L = location,
        els = Array.from(d.querySelectorAll('*[ngie-iid]')),
        socket = io([ L.protocol, L.host ].join('//'));

    // Send all uuids, get back object with all data, one by one binding
    socket.on('connect', function() {
        socket.on('handshake', function() {
            socket.emit('angie-bound-uuids', els.map(
                v => v.getAttribute('ngie-iid'))
            );
        });

        socket.on('angie-bound-uuid-values', function(data) {

            // Start by disconnecting all of the mutation observers
            MUTATION_OBSERVER.disconnect();

            // Next set up all of the initial values
            for (let key in data) {
                const VALUE = data[ key ],

                    // Filter is better...you don't have to scan the whole
                    // document
                    EL = els.filter(
                        v => v.getAttribute('ngie-iid') === key
                    )[ 0 ];
                setValue(EL, VALUE);
                stateValues[ key ] = VALUE;
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
                        observeMe.bind(el, socket), 250
                    ));
                } else {

                    // TODO this function needs to be resolved
                    MUTATION_OBSERVER.observe(el, MUTATION_OBSERVER_OPTIONS);
                }
            }

            socket.on('angie-bound-uuid-post', function(data) {
                const UUID = data.uuid,
                    VALUE = data.value;

                setValue(d.querySelector(`*[ngie-iid="${UUID}"]`), VALUE);
                stateValues[ UUID ] = VALUE;

                return true;
            });
        });

        socket.on('angie-socket-error', e => { throw new Error(e); });
    });

    // TODO you need to think about the names for these events
    // TODO USER CUSTOM CALLBACK
}

// TODO "rename me"
function observeMe(socket, e) {
    const UUID = this.getAttribute('ngie-iid');

    // TODO the mutation version of this needs to update before it sends
    socket.emit('angie-bound-uuid', {
        uuid: UUID,
        value: getValue.call(this),

        // TODO check this to verify the data on the BE,
        // TODO MutationObserver should have this
        pre: stateValues[ UUID ]
    });
}

function getValue(el) {
    el = el || this;

    return 'value' in el && $$value(el.value) ? el.value : el.innerHTML;
}

function setValue(el, v) {
    (el = el || this)[
        'value' in el ? 'value' :  'innerHTML'
    ] = v;

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