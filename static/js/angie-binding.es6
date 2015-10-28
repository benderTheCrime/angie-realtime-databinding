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
        const socket = io([ location.protocol, location.host ].join('//'));
    }
})(window, document);