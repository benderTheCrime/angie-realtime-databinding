// The socket.io package should attach the socket by default

'use strict';

(function (w, d) {

    // Attach a script
    var script = d.createElement('script');

    script.type = 'text/javascript';
    script.src = './socket.io/socket.io.js';
    script.onload = boot;

    d.body.appendChild(script);

    function boot() {
        var socket = io([location.protocol, location.host].join('//'));
    }
})(window, document);
// TODO write this in ES6 and transpile it into this directory