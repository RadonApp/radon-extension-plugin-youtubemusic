/* eslint-disable no-multi-spaces, key-spacing */
import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';

import {Artist, Album, Track} from 'neon-extension-framework/Models/Metadata/Music';

import Log from '../Core/Logger';
import Plugin from '../Core/Plugin';
import PlayerObserver from '../Observer/Player';


export default class PlayerMonitor extends EventEmitter {
    constructor() {
        super();

        // Private attributes
        this._currentItem = null;

        // Bind to player events
        PlayerObserver.on('queue.destroyed', this.onQueueDestroyed.bind(this));

        PlayerObserver.on('track.changed',   this.onTrackChanged.bind(this));
        PlayerObserver.on('track.paused',    () => this.emit('paused'));
        PlayerObserver.on('track.progress',  (time) => this.emit('progress', time));
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
            track = current && this._createTrack(current);
        } catch(e) {
            Log.error('Unable to create track: %s', e.message || e);
        }

        // Ensure track exists
        if(IsNil(track)) {
            Log.warn('Unable to parse track: %o', current);

            // Clear current identifier
            this._currentItem = null;

            // Emit "stopped" event
            this.emit('stopped');
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

    onQueueDestroyed() {
        Log.trace('PlayerMonitor.onQueueDestroyed');

        // Emit "stopped" event
        this.emit('stopped');
    }

    // endregion

    // region Private methods

    _createTrack({ id, title, duration, artist, album }) {
        if(IsNil(id)) {
            Log.warn('Unable to create track (no "id" defined)');
            return null;
        }

        if(IsNil(title)) {
            Log.warn('Unable to create track (no "title" defined)');
            return null;
        }

        if(IsNil(duration)) {
            Log.warn('Unable to create track (no "duration" defined)');
            return null;
        }

        if(IsNil(artist) || IsNil(artist.title)) {
            Log.warn('Unable to create track (no "artist" defined)');
            return null;
        }

        // Create track
        return Track.create(Plugin.id, {
            keys: {
                id
            },

            // Metadata
            duration: duration,
            title,

            // Children
            album: album && this._createAlbum(album),
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

    // endregion
}
