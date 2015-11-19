// The socket.io package should attach the socket by default

// TODO write this in ES6 and transpile it into this directory
'use strict';

(function (w, d) {

    // Attach a script
    var script = d.createElement('script');

    script.type = 'text/javascript';
    script.src = './socket.io/socket.io.js';
    script.onload = boot;

    d.body.appendChild(script);

    function boot() {
        var L = location,
            els = d.querySelectorAll('*[ngie-iid]'),
            socket = io([L.protocol, L.host].join('//'));
        console.log('ELS', els);
    }
})(window, document);
