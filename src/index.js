/**
 * @module index.js
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// System Modules
import util from                'util';
import { default as io } from   'socket.io';
import { sanitize } from        'google-caja-sanitizer';
import $Injector from           'angie-injector';

// This package should only be included when necessary! It will instantiate a listener
// and attach the client script ALWAYS!!!!

// TODO how does this work with cluster?

// The fact that the app is loaded before $$server is called makes this
// quite difficult



let bindings = {};

pollForExposedServerUpdate();

app.factory('$Bind', function(uuid, obj) {

    // TODO do a little validation here
    if (!obj.hasOwnProperty('id')) {
        for (let key in bindings) {
            const value = bindings[ key ];

            if (
                value.model === obj.model &&
                value.field === obj.field &&
                !value.hasOwnProperty('id')
            ) {
                uuid = key;
                break;
            }
        }
    } else {
        bindings[ uuid ] = obj; // WOOP WOOP!
    }

    return uuid;
});

function attachSocketListener() {
    const $server = $Injector.get('$server'),
        socket = io($server);

    app.service('$socket', socket);
    socket.on('connection', function(socket) {

        // TODO you can factor this out to be your BACKEND UPDATE FUNCTION
        socket.on('angie-bound-uuids', function(data) {
            try {
                let initialUUIDBoundDataState = {},
                    proms = [],
                    e = 'Unable to register ngieIid';

                // Ok here we have list of uuids
                for (let uuid of data) {
                    if (!bindings.hasOwnProperty(uuid)) {
                        return emitSocketError(e);
                    }

                    // Ok, we definitely have a binding...good
                    // TODO try to commonize
                    const BINDING = bindings[ uuid ];
                    let fieldName = BINDING.field,
                        obj = Object.keys(BINDING.filters || {}).length ?
                            BINDING.filters : {},
                        Model,
                        field,
                        prom;
                    try {

                        // Check to see if we have a model
                        Model = $Injector.get(BINDING.model);
                    } catch(e) {
                        e = 'Unable to fetch the targeted object';
                        return emitSocketError(e);
                    }

                    // Field takes precedence over defined "values" in filters
                    if (fieldName) {
                        obj.values = [ fieldName ];
                    }

                    if (BINDING.hasOwnProperty('id') && BINDING.id) {
                        obj.id = BINDING.id;
                    }

                    prom = Model.filter(obj).then((function(uuid, obj, fieldName, queryset) {
                        let result;

                        if (obj.hasOwnProperty('id')) {
                            result = queryset[ 0 ];
                            if (fieldName) {
                                result = result[ fieldName ];
                            }
                        } else {
                            result = queryset.results;
                        }

                        initialUUIDBoundDataState[ uuid ] = result;
                    }).bind(null, uuid, obj, fieldName));

                    proms.push(prom);
                }

                return Promise.all(proms).then(function() {
                    socket.emit('angie-bound-uuid-values', initialUUIDBoundDataState);
                }).catch(function(e) {
                    return emitSocketError(e.message);
                });
            } catch(e) {
                return emitSocketError(e.message);
            }
        });

        // THIS FOR UPDATING THE MODEL BASED ON FIELDS
        // I think you just killed it...
        socket.on('angie-bound-uuid', function(data) {
            let e = 'Unable to register ngieIid';

            if (!data.uuid || !bindings.hasOwnProperty(data.uuid)) {
                return emitSocketError(e);
            }

            // Ok, we definitely have a binding...good
            // TODO try to commonize
            const UUID = data.uuid,

                // Sanitize everything we get back from the front end
                VALUE = sanitize(data.value),
                BINDING = bindings[ UUID ];
            let fieldName = BINDING.field || BINDING.filters.values[ 0 ],
                obj = Object.keys(BINDING.filters || {}).length ?
                    BINDING.filters : {},
                Model,
                field;
            try {

                // Check to see if we have a model
                Model = $Injector.get(BINDING.model);

                // If we don't have a field to perform updates on we messed up
                if (!fieldName) {
                    throw new Error();
                }
            } catch(e) {
                e = 'Unable to update the targeted object';
                return emitSocketError(e);
            }

            if (data.hasOwnProperty('pre')) {
                obj = util._extend(obj, {
                    values: [ fieldName ],
                    [ fieldName ]: data.pre
                });

                if (BINDING.hasOwnProperty('id') && BINDING.id) {
                    obj.id = BINDING.id;
                }

                Model.filter(obj).then(function(queryset) {
                    if (
                        obj.id && fieldName &&
                        queryset[ 0 ] &&
                        queryset[ 0 ][ fieldName ] === data.pre
                    ) {
                        return queryset;
                    } else if (queryset === data.pre) {
                        return queryset;
                    } else {
                        throw new Error('Invalid pre-change data');
                    }
                }).then(function(queryset) {
                    return queryset.update({ [ fieldName ]: VALUE });
                }).then(function(queryset) {
                    return socket.emit('angie-bound-uuid-post', {
                        uuid: UUID,
                        value: VALUE
                    });
                }).catch(function(e) {
                    return emitSocketError(e.message);
                });
            } else {

                // TODO model validation error
                return emitSocketError('Invalid pre-change data');
            }
        });

        // TODO destroy bindings when page is navigated away from
        socket.on('disconnect', function(uuids) {

            // TODO...this should be if ALL of the clients listening on this
            // uuid are destroyed
            for (let uuid of uuids) {
                delete bindings[ uuid ];
            }
        });

        // TODO some verification
        socket.emit('handshake');
    });

    function emitSocketError(e) {
        // For instance, a botched UUID was passed
        socket.emit('angie-socket-error', e);
    }
}

function pollForExposedServerUpdate() {
    if (
        global.app.services.$server &&
        Object.keys(global.app.services.$server).length
    ) {
        return attachSocketListener();
    }
    setImmediate(pollForExposedServerUpdate);
}

// TODO perform mutation observance
    // Check to see if attributed property is changed

// TODO front end has percieved state of data...
    // Updates are made instantly in the client js
    // Updates are made instantly in the server session
    // Updates are pushed to the DB

// TODO setup update pushes from sent (shared) objects HUGE TODO!!!
// TODO should update before send

// TODO the DB has a solid state of data
    // Updates made to the DB push data to the app, update state
    // Changes made to the app push data to the frontend, update state

// TODO callback

// TODO change ngie-value to ngie-binding
// TODO encryption
// TODO observable attributes
// TODO some error values need to be massaged, errors for failure to update