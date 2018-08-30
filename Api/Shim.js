import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';
import Runtime from 'wes/runtime';

import {awaitBody} from '@radon-extension/framework/Document/Await';
import {createScript} from '@radon-extension/framework/Utilities/Script';

import Log from '../Core/Logger';


const RequestTimeout = 10 * 1000;

export class YouTubeMusicShimEvents extends EventEmitter {
    constructor() {
        super();

        // Ensure body exists
        if(IsNil(document.body)) {
            throw new Error('Body is not available');
        }

        // Bind to events
        this._bind('neon.event', (e) => this._onEvent(e));
    }

    _bind(event, callback) {
        try {
            document.body.addEventListener(event, callback);
        } catch(e) {
            Log.error('Unable to bind to "%s"', event, e);
            return false;
        }

        Log.debug('Bound to "%s"', event);
        return true;
    }

    _onEvent(e) {
        if(!e || !e.detail) {
            Log.error('Invalid event received:', e);
            return;
        }

        // Decode event
        let event;

        try {
            event = JSON.parse(e.detail);
        } catch(err) {
            Log.error('Unable to decode event: %s', err && err.message, err);
            return;
        }

        Log.trace('Received "%s" event', event.type);

        // Emit event
        this.emit(event.type, ...event.args);
    }
}

export class YouTubeMusicShim extends EventEmitter {
    constructor() {
        super();

        this._configuration = {};
        this._events = null;

        this._injected = false;
        this._injecting = null;
    }

    get events() {
        return this._events;
    }

    get injected() {
        return this._injected;
    }

    get injecting() {
        return this._injecting;
    }

    inject(options) {
        if(this._injected) {
            return Promise.resolve();
        }

        // Inject shim into page (if not already injecting)
        if(IsNil(this._injecting)) {
            this._injecting = this._inject(options);
        }

        // Return current promise
        return this._injecting;
    }

    configuration() {
        return this.inject().then(() =>
            this._request('configuration')
        );
    }

    state() {
        return this.inject().then(() =>
            this._request('state')
        );
    }

    // region Private methods

    _await(type, callback) {
        return new Promise((resolve, reject) => {
            let listener;

            // Create timeout callback
            let timeoutId = setTimeout(() => {
                if(!IsNil(listener)) {
                    this._events.removeListener(type, listener);
                }

                // Reject promise
                reject(new Error('Request timeout'));
            }, RequestTimeout);

            // Create listener callback
            listener = (event) => {
                clearTimeout(timeoutId);

                // Resolve promise
                resolve(event);
            };

            // Wait for event
            this._events.once(type, listener);

            // Fire callback
            if(!IsNil(callback)) {
                callback();
            }
        });
    }

    _emit(type, ...args) {
        let request = new CustomEvent('neon.event', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit event on the document
        document.body.dispatchEvent(request);
    }

    _request(type, ...args) {
        let requestEvent = new CustomEvent('neon.request', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit request, and await response
        return this._await(type, () => {
            // Emit request to shim
            document.body.dispatchEvent(requestEvent);
        });
    }

    _inject() {
        // Wait until body is available
        return awaitBody().then(() => {
            let script = createScript(document, Runtime.getURL('/Plugins/youtubemusic/Shim.js'));

            // Create events interface
            this._events = new YouTubeMusicShimEvents();

            // Insert script into page
            (document.head || document.documentElement).appendChild(script);

            // Wait for "configuration" event
            return this._await('configuration').then((configuration) => {
                // Update state
                this._configuration = configuration;
                this._injected = true;
                this._injecting = null;
            }, () => {
                // Update state
                this._configuration = null;
                this._injected = false;
                this._injecting = null;

                // Reject promise
                return Promise.reject(new Error('Inject timeout'));
            });
        });
    }

    // endregion
}

export default new YouTubeMusicShim();
