/* eslint-disable no-multi-spaces, key-spacing */
import Debounce from 'lodash-es/debounce';
import ForEach from 'lodash-es/forEach';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';
import URI from 'urijs';

import ShimApi from '../Api/Shim';
import Log from '../Core/Logger';
import Observer from './Base';
import {getIdentifier} from '../Core/Helpers';


export class PlayerObserver extends Observer {
    constructor() {
        super();

        // Create debounced `onTrackChanged` function
        this.onTrackChanged = Debounce(this._onTrackChanged.bind(this), 5 * 1000);

        // Observers
        this.body = null;

        this.playerBar = null;

        this.wrapper = null;
        this.controls = null;

        this.title = null;

        this.bylineWrapper = null;
        this.subtitle = null;
        this.byline = null;

        this.bylines = null;

        // Private attributes
        this._currentTrack = null;
        this._currentVideo = null;
        this._progressEmitterEnabled = false;
        this._queueCreated = false;
    }

    create() {
        // Observe body
        this.body = this.observe(document, 'body');

        // Observe player bar
        this.playerBar = this.observe(this.body, 'ytmusic-player-bar', { attributes: ['player-ui-state_'] })
            .onAttributeChanged('player-ui-state_', this.onPlayerVisibilityChanged.bind(this));

        // Observe controls
        this.wrapper = this.observe(this.playerBar, '.control-wrapper');
        this.controls = this.observe(this.wrapper, '.middle-controls');

        // Observe title
        this.title = this.observe(this.controls, '.title', { text: true })
            .on('mutation', this.onTrackChanged.bind(this));

        // Observe byline
        this.bylineWrapper = this.observe(this.controls, '.byline-wrapper');
        this.subtitle = this.observe(this.bylineWrapper, '.subtitle');
        this.byline = this.observe(this.subtitle, '.byline');

        this.bylines = this.observe(this.byline, 'a', { text: true })
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
        } else {
            this.emit('track.stopped');
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
        let current = this._createTrack(
            this.title.first(),
            this.bylines.all()
        );

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
    }

    // endregion

    // region Private Methods

    _createTrack($title, $bylines) {
        let title = this._getText($title);

        if(IsNil(title) || IsNil(this._currentVideo)) {
            return null;
        }

        // Create children
        let album = null;
        let artist = null;

        ForEach($bylines, ($byline) => {
            let href = $byline.href;

            // Album
            if(href.indexOf('album/ALBUM_RELEASE/') > 0) {
                album = album || this._createAlbum($byline);
                return;
            }

            // Artist
            if(href.indexOf('browse/') > 0) {
                artist = artist || this._createArtist($byline);
                return;
            }
        });

        if(IsNil(artist)) {
            return null;
        }

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

        if(IsNil(id)) {
            return null;
        }

        return {
            id,

            title: this._getText($album)
        };
    }

    _createArtist($artist) {
        let id = this._getId($artist);

        if(IsNil(id)) {
            return null;
        }

        return {
            id,

            title: this._getText($artist)
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

    _startProgressEmitter() {
        if(this._progressEmitterEnabled) {
            return;
        }

        // Reset state
        this._currentVideo = null;

        // Enable progress emitter
        this._progressEmitterEnabled = true;

        // Construct read method
        let get = () => {
            if(!this._progressEmitterEnabled) {
                Log.debug('Stopped progress emitter');
                return;
            }

            // Retrieve state
            ShimApi.state().then(({ player }) => {
                Log.debug('Received player state:', player);

                // Retrieve video details
                let video = this._getVideoDetails(player);

                if(IsNil(video)) {
                    Log.debug('Unable to retrieve video details (player: %o)', player);
                    return;
                }

                // Update video details (if changed)
                if(!IsEqual(this._currentVideo, video)) {
                    // Store video details
                    this._currentVideo = video;

                    // Fire track changed
                    this.onTrackChanged();
                } else {
                    // Emit "progress" event
                    this.emit('track.progress', player.time * 1000);
                }

                // Queue next event
                setTimeout(get, 5 * 1000);
            });
        };

        // Start reading track progress
        Log.debug('Started progress emitter');
        get();
    }

    _stopProgressEmitter() {
        this._progressEmitterEnabled = false;
    }

    // endregion
}

export default new PlayerObserver();
