/**
 * @module index.js
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// System Modules
import { default as io } from   'socket.io';
import $Injector from           'angie-injector';

// This package should only be included when necessary! It will instantiate a listener
// and attach the client script ALWAYS!!!!

// TODO how does this work with cluster?

// The fact that the app is loaded before $$server is called makes this
// quite difficult

pollForExposedServerUpdate();

function test() {
    const $server = $Injector.get('$server'),
        socket = io($server);

    socket.on('connection', function() {
        console.log('connected');

        // TODO
        // For each directive instance
            // Is it attached to an observer?
            // Is there a model associated?
            // To which keys is the model associated?
        //
    });

    app.service('$socket', socket);
}

function pollForExposedServerUpdate() {
    if (
        global.app.services.$server &&
        Object.keys(global.app.services.$server).length
    ) {
        return test();
    }
    setImmediate(pollForExposedServerUpdate);
}

// TODO Fix Injector
    // Remove registry stuff DONE
    // README Explaination of why it can't be used generically DONE
    // Special cases for request response and scope DONE
    // Expose scope $$fetch, request $$fetch and response $$fetch as modules
// TODO setup simple sessions
    // Cookie service -> Should be able to manage the session cookie
    // Need to alias fetch to be provided when scope is called
// TODO instantiate and store $scope on sessions
    // Change scope fetcher to retrieve $scope, $request, $response from the session
// TODO make directives persist to frontend if they are supposed to observe
    // Make ngie-value directive -> put in directive specific service
    // Add "ngie-id" as uuid or something equivalent to keep track of databound entities
    // $compile should recognize when a scoped property is bound
// TODO perform mutation observance
    // Check to see if attributed property is changed

// TODO front end has percieved state of data...
    // Updates are made instantly in the client js
    // Updates are made instantly in the server session
    // Updates are pushed to the DB

// TODO the DB has a solid state of data
    // Updates made to the DB push data to the app, update state
    // Changes made to the app push data to the frontend, update state