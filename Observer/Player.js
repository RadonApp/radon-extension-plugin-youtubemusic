/* eslint-disable no-multi-spaces, key-spacing */
import Debounce from 'lodash-es/debounce';
import ForEach from 'lodash-es/forEach';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import URI from 'urijs';

import {createArtistTitle, resolveArtists} from '@radon-extension/framework/Utilities/Metadata';

import ShimApi from '../Api/Shim';
import Log from '../Core/Logger';
import Observer from './Base';
import {getIdentifier} from '../Core/Helpers';


export class PlayerObserver extends Observer {
    constructor() {
        super();

        // Create debounced `onTrackChanged` function
        this._onTrackChangedDebounced = Debounce(this._onTrackChanged.bind(this), 5000);

        // Observers
        this.body = null;

        this.playerBar = null;
        this.controls = null;

        this.title = null;
        this.bylines = null;

        // Private attributes
        this._currentTrack = null;
        this._currentVideo = null;

        this._progressEmitter = null;

        this._progressPaused = false;
        this._progressPausedTimeout = null;

        this._queueCreated = false;
    }

    create() {
        // Observe body
        this.body = this.observe(document, 'body');

        // Observe player bar
        this.playerBar = this.observe(this.body, 'ytmusic-player-bar', { attributes: ['player-ui-state_'] })
            .onAttributeChanged('player-ui-state_', this.onPlayerVisibilityChanged.bind(this));

        // Observe controls
        this.controls = this.observe(this.playerBar, '.middle-controls');

        // Observe title
        this.title = this.observe(this.controls, '.title', { text: true })
            .on('mutation', this.onTrackChanged.bind(this));

        // Observe bylines
        this.bylines = this.observe(this.controls, '.subtitle .byline a', { text: true })
            .on('mutation', this.onTrackChanged.bind(this));

        // Bind to state changed event
        ShimApi.events.on('player.state', this.onPlayerStateChanged.bind(this));
    }

    // region Event Handlers

    onPlayerStateChanged(state) {
        Log.trace('Player state changed to %s', state);

        if(state === 1) {
            // Start progress emitter
            this._startProgressEmitter();
            return;
        }

        // Stop progress emitter
        this._stopProgressEmitter();

        // Emit events
        if(state === 2) {
            this.emit('track.paused');
        }
    }

    onPlayerVisibilityChanged() {
        let node = this.playerBar.first();

        // Update queue state
        if(!IsNil(node) && node.getAttribute('player-ui-state_') !== 'INACTIVE') {
            this._onQueueCreated();
        } else {
            this._onQueueDestroyed();
        }
    }

    onTrackChanged() {
        // Cancel existing timeout
        if(!IsNil(this._progressPausedTimeout)) {
            clearTimeout(this._progressPausedTimeout);
        }

        // Pause progress events
        if(!this._progressPaused) {
            this._progressPaused = true;

            Log.trace('Paused progress events');
        }

        // Emit track change
        this._onTrackChangedDebounced();
    }

    _onQueueCreated() {
        if(this._queueCreated) {
            return;
        }

        // Update state
        this._queueCreated = true;

        // Emit event
        this.emit('queue.created');
    }

    _onQueueDestroyed() {
        if(!this._queueCreated) {
            return;
        }

        // Update state
        this._queueCreated = false;

        // Emit event
        this.emit('queue.destroyed');
    }

    _onTrackChanged() {
        let $controls = this.controls.first();

        // Retrieve state
        ShimApi.state().then(({ player }) => {
            Log.trace('(Track Changed) Received player state:', player);

            // Retrieve video details
            this._currentVideo = this._getVideoDetails(player);

            if(IsNil(this._currentVideo)) {
                Log.debug('Unable to retrieve video details (player: %o)', player);
                return;
            }

            // Create track
            let current = this._createTrack(
                $controls.querySelector('.title'),
                $controls.querySelector('.subtitle .byline')
            );

            Log.trace('Current track: %o', current);

            // Ensure track has changed
            if(IsEqual(this._currentTrack, current)) {
                return;
            }

            // Store current track
            let previous = this._currentTrack;

            // Update current track
            this._currentTrack = current;

            // Emit "track.changed" event
            this.emit('track.changed', { previous, current });

            // Log track change
            Log.trace('Track changed to %o', current);

            // Start progress emitter
            this._startProgressEmitter();

            // Start progress events in 10 seconds
            this._progressPausedTimeout = setTimeout(() => {
                this._progressPaused = false;

                Log.trace('Started progress events');
            }, 10 * 1000);
        });
    }

    // endregion

    // region Private Methods

    _createTrack($title, $bylines) {
        let title = this._getText($title);

        if(IsNil(title) || title.length < 1 || IsNil(this._currentVideo)) {
            return null;
        }

        // Create children
        let album = null;
        let artists = [];
        let type = 0;

        ForEach($bylines.childNodes, ($byline) => {
            if($byline.textContent.indexOf('•') >= 0) {
                type++;
            }

            if($byline.nodeName !== 'A') {
                return;
            }

            if(type === 0) {
                artists.push(this._createArtist($byline));
                return;
            }

            if(type === 1) {
                album = album || this._createAlbum($byline);
                return;
            }
        });

        // Resolve artists (remove duplicate artists)
        artists = resolveArtists(title, artists);

        // Ensure at least one artist exists
        if(artists.length < 1) {
            return null;
        }

        // Merge artists
        let artist = {
            id: Map(artists, 'id').join(','),

            // Merge artist titles (e.g. 1, 2 & 3)
            title: createArtistTitle(Map(artists, 'title'))
        };

        // Create track
        return {
            ...this._currentVideo,

            // Metadata
            title,

            // Children
            album,
            artist
        };
    }

    _createAlbum($album) {
        let id = this._getId($album);

        // Ensure identifier exists
        if(IsNil(id)) {
            return null;
        }

        // Retrieve title
        let title = this._getText($album);

        if(IsNil(title) || title.length < 1) {
            return null;
        }

        // Build album
        return {
            id,
            title
        };
    }

    _createArtist($artist) {
        let id = this._getId($artist);

        // Ensure identifier exists
        if(IsNil(id)) {
            return null;
        }

        // Retrieve title
        let title = this._getText($artist);

        if(IsNil(title) || title.length < 1) {
            return null;
        }

        // Build artist
        return {
            id,
            title
        };
    }

    _getId(node) {
        return getIdentifier(node && node.href);
    }

    _getText(node) {
        let value = (node && node.innerText) || '';

        if(value.length < 1) {
            return null;
        }

        return value;
    }

    _getVideoDetails(player) {
        let url = new URI(player.url);

        // Retrieve parameters
        let params = url.search(true);

        if(IsNil(params.v)) {
            return null;
        }

        // Build video details
        return {
            duration: Math.ceil(player.duration) * 1000,
            id: params.v
        };
    }

    _emitProgress() {
        if(this._progressPaused) {
            Log.debug('(Progress) Track changing, waiting for next event');

            // Queue next event
            this._progressEmitter = setTimeout(this._emitProgress.bind(this), 5 * 1000);
            return;
        }

        // Retrieve state
        ShimApi.state().then(({ player }) => {
            Log.trace('(Progress) Received player state:', player);

            // Emit "progress" event
            this.emit('track.progress', player.time * 1000);

            // Queue next event
            this._progressEmitter = setTimeout(this._emitProgress.bind(this), 5 * 1000);
        });
    }

    _startProgressEmitter() {
        let running = !IsNil(this._progressEmitter);

        // Stop progress emitter
        if(running) {
            clearTimeout(this._progressEmitter);
        }

        // Start progress emitter
        this._progressEmitter = setTimeout(this._emitProgress.bind(this), 5 * 1000);

        // Log state
        if(running) {
            Log.trace('Restarted progress emitter');
        } else {
            Log.trace('Started progress emitter');
        }
    }

    _stopProgressEmitter() {
        if(IsNil(this._progressEmitter)) {
            return;
        }

        // Stop progress emitter
        clearTimeout(this._progressEmitter);

        // Reset state
        this._progressEmitter = null;

        Log.trace('Stopped progress emitter');
    }

    // endregion
}

export default new PlayerObserver();
