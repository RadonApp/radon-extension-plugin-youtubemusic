/* eslint-disable no-console */
import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';

import {awaitPlayer} from '../Core/Helpers';


export class ShimRequests extends EventEmitter {
    constructor() {
        super();

        // Ensure body exists
        if(IsNil(document.body)) {
            throw new Error('Body is not available');
        }

        // Bind to events
        this._bind('neon.request', (e) => this._onRequest(e));
    }

    _bind(event, callback) {
        try {
            document.body.addEventListener(event, callback);
        } catch(e) {
            console.error('Unable to bind to "%s"', event, e);
            return false;
        }

        console.debug('Bound to "%s"', event);
        return true;
    }

    _onRequest(e) {
        if(!e || !e.detail) {
            console.error('Invalid request received:', e);
            return;
        }

        // Decode request
        let request;

        try {
            request = JSON.parse(e.detail);
        } catch(err) {
            console.error('Unable to decode request: %s', err && err.message, err);
            return;
        }

        // Emit request
        this.emit(request.type, ...request.args);
    }
}

export default class Shim {
    constructor() {
        this.requests = new ShimRequests();
        this.requests.on('configuration', () => this.configuration());
        this.requests.on('state', () => this.state());

        // Private attributes
        this._player = null;

        // Wait for player to load
        awaitPlayer().then(this.onPlayerLoaded.bind(this));
    }

    // region Event Handlers

    onPlayerLoaded(player) {
        this._player = player;

        // Emit "configuration" event
        this.configuration();

        // Emit initial state
        this._emit('player.state', player.getPlayerState());

        // Emit player changes
        player.addEventListener('onStateChange', (state) =>
            this._emit('player.state', state)
        );
    }

    // endregion

    // region Public Methods

    configuration() {
        if(IsNil(window) || IsNil(window['yt'])) {
            console.warn('Unable to find configuration in "window.yt"');
            return;
        }

        // Emit event
        this._emit('configuration', window['yt'].config_);
    }

    state() {
        // Emit event
        this._emit('state', {
            player: this._player && {
                duration: this._player.getDuration(),
                state: this._player.getPlayerState(),
                time: this._player.getCurrentTime(),
                url: this._player.getVideoUrl()
            }
        });
    }

    // endregion

    // region Private Methods

    _emit(type, ...args) {
        // Construct event
        let event = new CustomEvent('neon.event', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit event on the document
        document.body.dispatchEvent(event);
    }

    // endregion
}
