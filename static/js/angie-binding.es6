// The socket.io package should attach the socket by default

// TODO write this in ES6 and transpile it into this directory
(function(w, d) {

    // Attach a script
    let script = d.createElement('script');

    script.type = 'text/javascript';
    script.src = './socket.io/socket.io.js';
    script.onload = boot;

    d.body.appendChild(script);




    function boot() {
        const L = location,
            els = d.querySelectorAll('*[ngie-iid]'),
            socket = io([ L.protocol, L.host ].join('//'));
        console.log('ELS', els);

        // TODO send all uuids, get back object with all data, one by one binding
        socket.emit('angie-bound-uuids', els.map(v => v.getAttribute('ngie-iid')));
        socket.on('angie-bound-uuid-values', function(obj) {
            for (let key in obj) {
                const value = obj[ key ],
                    el = els.filter(v => v.getAttribute('ngie-iid') === key)[ 0 ];

                if (el.hasOwnProperty('value')) {
                    el.value = value;
                } else {
                    el.innerHTML = value;
                }
            }
        });

        // TODO bind an update event to each element
        // TODO have it update value before it sends data
        for (let el of els) {

        }

        // TODO setup update pushes from sent (shared) objects
        // TODO should update before send
    }
})(window, document);