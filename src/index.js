/**
 * @module index.js
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// System Modules
import crypto from                              'crypto';
import util from                                'util';
import { default as io } from                   'socket.io';
import { sanitize } from                        'google-caja-sanitizer';
import $Injector from                           'angie-injector';
import $LogProvider from                        'angie-log';

// Angie Binding Modules
import { default as AC } from                   './util/encryption';

// This package should only be included when necessary! It will instantiate a l
// istener and attach the client script ALWAYS!!!!

// TODO how does this work with cluster?
const UNUSED_BINDING_DISPOSAL_TIMEOUT = +(
        app.$$config.hasOwnProperty('unusedBindingDisposalTimeoutHours') ?
            app.$$config.unusedBindingDisposalTimeoutHours : 48
    ) * 60 * 60 * 1000;
let bindings = {};

pollForExposedServerUpdate();

app.factory('$Bind', function(uuid, obj) {
    let duplicateUUID = null;

    for (let key in bindings) {
        const value = bindings[ key ];

        if (
            value.model === obj.model &&
            value.field === obj.field &&
            (
                !value.id || (value.id && value.id === obj.id)
            )
        ) {
            duplicateUUID = key;
            break;
        }
    }

    if (!duplicateUUID) {
        bindings[ uuid ] = util._extend({
            passphrase: crypto.randomBytes(256).toString('base64')
        }, obj);

        // When we set up a binding, we also define a timeout
        setUnusedBindingDisposalTimeout(uuid);
        return uuid;
    }

    return duplicateUUID;
});

function attachSocketListener() {
    const IO = io($Injector.get('$server'));

    app.service('$socket', IO);
    IO.on('connection', function(socket) {
        socket.on('a0001', function(data) {
            let initialUUIDBoundDataState = {},
                proms = [],
                e = 'Unable to register ngieIid';

            // Here we have list of uuids
            for (let uuid of data) {
                const emitSocketUUIDError = emitSocketError.bind(null, uuid);
                if (!bindings.hasOwnProperty(uuid)) {
                    return emitSocketUUIDError(e);
                }

                // Ok, we definitely have a binding...good
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
                    return emitSocketUUIDError(e);
                }

                // Field takes precedence over defined "values" in filters
                if (fieldName) {
                    obj.values = [ fieldName ];
                }

                if (BINDING.hasOwnProperty('id') && BINDING.id) {
                    obj.id = BINDING.id;
                }

                prom = Model.filter(obj).then((function(
                    uuid,
                    obj,
                    fieldName,
                    queryset
                ) {
                    const PASSPHRASE = bindings[ uuid ].passphrase;
                    let result;

                    if (obj.hasOwnProperty('id')) {
                        result = queryset[ 0 ];
                        if (fieldName) {
                            result = result[ fieldName ];
                        }
                    } else {
                        result = queryset.results;
                    }

                    initialUUIDBoundDataState[ uuid ] = {
                        passphrase: PASSPHRASE,
                        value: AC.encrypt(result, PASSPHRASE)
                    };

                    // Reset the binding timeout
                    setUnusedBindingDisposalTimeout(uuid);
                }).bind(null, uuid, obj, fieldName));
                proms.push(prom);
            }

            return Promise.all(proms).then(function() {
                socket.emit('a0002', initialUUIDBoundDataState);
            }).catch(function(e) {
                return emitSocketError(null, e.message);
            });
        });

        // THIS FOR UPDATING THE MODEL BASED ON FIELDS
        // I think you just killed it...
        socket.on('a0003', function(data) {
            let e = 'Unable to register ngieIid';

            if (!data.uuid || !bindings.hasOwnProperty(data.uuid)) {
                return emitSocketError(null, e);
            }

            console.log('DATA', data);

            const UUID = data.uuid,

                // Sanitize everything we get back from the front end
                BINDING = bindings[ UUID ],
                PASSPHRASE = BINDING.passphrase,
                PRE = AC.decrypt(data.pre, PASSPHRASE),
                VALUE = AC.decrypt(sanitize(data.value), PASSPHRASE),
                emitSocketUUIDError = emitSocketError.bind(null, UUID);
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
                return emitSocketUUIDError(e);
            }

            if (data.hasOwnProperty('pre')) {
                obj = util._extend(obj, {
                    values: [ fieldName ],
                    [ fieldName ]: PRE
                });

                if (BINDING.hasOwnProperty('id') && BINDING.id) {
                    obj.id = BINDING.id;
                }

                Model.filter(obj).then(function(queryset) {
                    if (
                        obj.id && fieldName &&
                        queryset[ 0 ] &&
                        queryset[ 0 ][ fieldName ] === PRE
                    ) {
                        return queryset;
                    } else if (queryset === PRE) {
                        return queryset;
                    } else {
                        throw new Error('Invalid pre-change data');
                    }
                }).then(function(queryset) {
                    return queryset.update({ [ fieldName ]: VALUE });
                }).then(function(queryset) {
                    const ENCRYPTED_VALUE = AC.encrypt(VALUE, PASSPHRASE);

                    // Reset the binding timeout
                    setUnusedBindingDisposalTimeout(UUID);
                    return IO.sockets.emit(`a0004::${UUID}`, {
                        value: ENCRYPTED_VALUE
                    });
                }).catch(function(e) {
                    return emitSocketUUIDError(e.message);
                    throw e;
                });
            } else {
                return emitSocketUUIDError('Invalid pre-change data');
            }
        });

        socket.on('disconnect', function() {});
        socket.on('error', function(e) {
            $LogProvider.error(e);
        });
        socket.emit('handshake');

        function emitSocketError(uuid, message) {

            // For instance, a botched UUID was passed
            socket.emit(`a0005${uuid ? `::${uuid}` : ''}`, { message });
        }
    });
}

function pollForExposedServerUpdate() {
    if (app.services.$server && Object.keys(app.services.$server).length) {
        return attachSocketListener();
    }
    setImmediate(pollForExposedServerUpdate);
}

function setUnusedBindingDisposalTimeout(uuid) {
    const fn = (function(uuid) {
        if (bindings.hasOwnProperty(uuid)) {
            delete bindings[ uuid ];
        }
    }).bind(null, uuid);

    if (bindings[ uuid ] && bindings[ uuid ].hasOwnProperty('timeout')) {
        clearTimeout(bindings[ uuid ].timeout);
    }

    bindings[ uuid ].timeout =
        setTimeout(fn, UNUSED_BINDING_DISPOSAL_TIMEOUT);

    return true;
}

// TODO forms and grouping
// TODO change ngie-value to ngie-binding
// TODO observable attributes
// TODO docs and tests