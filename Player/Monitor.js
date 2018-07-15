/* eslint-disable no-multi-spaces, key-spacing */
import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import {Artist, Album, Track} from 'neon-extension-framework/Models/Metadata/Music';

import Log from '../Core/Logger';
import Plugin from '../Core/Plugin';
import PlayerObserver from '../Observer/Player';


export default class PlayerMonitor extends EventEmitter {
    constructor(options) {
        super();

        // Parse options
        this.options = Merge({
            progressInterval: 5000
        }, options);

        // Private attributes
        this._currentItem = null;
        this._currentPosition = 0;

        this._progressEmitterEnabled = false;

        // Bind to player events
        PlayerObserver.on('position.changed', this.onPositionChanged.bind(this));

        PlayerObserver.on('queue.created',   this.onQueueCreated.bind(this));
        PlayerObserver.on('queue.destroyed', this.onQueueDestroyed.bind(this));

        PlayerObserver.on('track.changed',   this.onTrackChanged.bind(this));
    }

    start() {
        // Start observing player
        PlayerObserver.start();
    }

    // region Event handlers

    onTrackChanged({ previous, current }) {
        Log.trace('PlayerMonitor.onTrackChanged: %o -> %o', previous, current);

        let track = null;

        // Try construct track
        try {
            track = this._createTrack(current);
        } catch(e) {
            Log.error('Unable to create track: %s', e.message || e);
        }

        // Ensure track exists
        if(IsNil(track)) {
            Log.warn('Unable to parse track: %o', current);

            this._currentItem = null;
            return;
        }

        // Ensure track has changed
        if(!IsNil(this._currentItem) && this._currentItem.matches(track)) {
            return;
        }

        // Update current identifier
        this._currentItem = track;

        // Emit "created" event
        this.emit('created', track);
    }

    onPositionChanged(position) {
        Log.trace('PlayerMonitor.onPositionChanged', position);

        // Update position
        this._currentPosition = position;
    }

    onQueueCreated() {
        Log.trace('PlayerMonitor.onQueueCreated');

        // Start progress emitter
        this._startProgressEmitter();
    }

    onQueueDestroyed() {
        Log.trace('PlayerMonitor.onQueueDestroyed');

        // Stop progress emitter
        this._progressEmitterEnabled = false;

        // Emit "stopped" event
        this.emit('stopped');
    }

    // endregion

    // region Private methods

    _createTrack({ title, artist, album }) {
        if(IsNil(title) || IsNil(artist.title)) {
            return null;
        }

        // Create track
        return Track.create(Plugin.id, {
            // Metadata
            title,

            // Children
            album: this._createAlbum(album),
            artist: this._createArtist(artist)
        });
    }

    _createAlbum({ id, title }) {
        if(IsNil(title)) {
            id = null;
            title = null;
        }

        // Create album
        return Album.create(Plugin.id, {
            keys: {
                id
            },

            // Metadata
            title
        });
    }

    _createArtist({ id, title }) {
        if(IsNil(title)) {
            id = null;
            title = null;
        }

        // Create artist
        return Artist.create(Plugin.id, {
            keys: {
                id
            },

            // Metadata
            title
        });
    }

    _startProgressEmitter() {
        if(this._progressEmitterEnabled) {
            return;
        }

        this._progressEmitterEnabled = true;

        // Construct read method
        let get = () => {
            if(!this._progressEmitterEnabled) {
                Log.debug('Stopped progress emitter');
                return;
            }

            // Emit "progress" event
            this.emit('progress', this._currentPosition * 1000);

            // Queue next event
            setTimeout(get, this.options.progressInterval);
        };

        // Start reading track progress
        Log.debug('Started progress emitter');
        get();
    }

    // endregion
}
