// The socket.io package should attach the socket by default
// TODO consider webpack
// import '../bower_components/MutationObserver/MutationObserver';

(function(w, d) {

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
    let script = d.createElement('script');

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
                socket.emit('angie-bound-uuids', els.map(v => v.getAttribute('ngie-iid')));
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
                }

                // Bind an update event to each element
                // This only fires once in a page load, so it's ok
                for (let el of Array.from(els)) {
                    let node = el.nodeName.toLowerCase();

                    // TODO resolve for all elements, function

                    if ([ 'select', 'textarea', 'input', 'button' ].indexOf(node) > -1) {
                        let eName = 'keyup';
                        if (node === 'select' || [ 'checkbox', 'radio' ].indexOf(el.type) > -1) {
                            eName = 'change';
                        }
                        d.addEventListener(eName, observeMe.bind(el, socket));
                    } else {

                        // TODO this function needs to be resolved
                        MUTATION_OBSERVER.observe(el, MUTATION_OBSERVER_OPTIONS);
                    }
                }

                socket.on('angie-bound-uuid-post', function(data) {
                    return setValue(d.querySelector(
                        '*[ngie-iid="' + data.uuid + '"]'
                    ), data.value);
                });
            });

            socket.on('angie-socket-error', e => { throw new Error(e); });
        });

        // TODO you need to think about the names for these events
        // TODO can you add and remove bindings via the frontend?
        // TODO USER CUSTOM CALLBACK
    }

    function observeMe(socket, e) {

        // TODO the mutation version of this needs to update before it sends
        socket.emit('angie-bound-uuid', {
            uuid: this.getAttribute('ngie-iid'),
            value: getValue.call(this),

            // TODO check this to verify the data on the BE,
            // TODO MutationObserver should have this
            pre: 'd'
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
})(window, document);