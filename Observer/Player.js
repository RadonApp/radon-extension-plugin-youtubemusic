/* eslint-disable no-multi-spaces, key-spacing */
import Debounce from 'lodash-es/debounce';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';

import Log from '../Core/Logger';
import Observer from './Base';
import {getIdentifier} from '../Core/Helpers';


export class PlayerObserver extends Observer {
    constructor() {
        super();

        // Create debounced `onTrackChanged` function
        this.onTrackChanged = Debounce(this._onTrackChanged, 5000);

        this.body = null;

        this.playerBar = null;

        this.progressBar = null;
        this.sliderBar = null;

        this.wrapper = null;
        this.controls = null;

        this.title = null;

        this.bylineWrapper = null;
        this.subtitle = null;
        this.byline = null;

        this.bylines = null;

        // Private attributes
        this._currentTrack = null;
        this._queueCreated = false;
    }

    create() {
        // Observe body
        this.body = this.observe(document, 'body');

        // Observe player bar
        this.playerBar = this.observe(this.body, 'ytmusic-player-bar', { attributes: ['player-ui-state_'] })
            .onAttributeChanged('player-ui-state_', this.onPlayerStateChanged.bind(this));

        // Observe progress bar
        this.progressBar = this.observe(this.playerBar, '#progress-bar');

        this.sliderBar = this.observe(this.progressBar, '#sliderBar', { attributes: ['value'] })
            .onAttributeChanged('value', this.onProgressChanged.bind(this));

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
    }

    // region Event Handlers

    onPlayerStateChanged() {
        let node = this.playerBar.first();

        // Update queue state
        if(!IsNil(node) && node.getAttribute('player-ui-state_') !== 'INACTIVE') {
            this._onQueueCreated();
        } else {
            this._onQueueDestroyed();
        }
    }

    onProgressChanged() {
        let node = this.sliderBar.first();

        if(IsNil(node)) {
            return;
        }

        // Retrieve position
        let position = node.getAttribute('value') || null;

        if(IsNil(position)) {
            return;
        }

        // Emit event
        this.emit('position.changed', position);
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
        if($bylines.length < 2) {
            return null;
        }

        // Retrieve title
        let title = this._getText($title);

        if(IsNil(title)) {
            return null;
        }

        // Create children
        let album = this._createAlbum($bylines[$bylines.length - 1]);
        let artist = this._createArtist($bylines[0]);

        if(IsNil(album) || IsNil(artist)) {
            return null;
        }

        // Create track
        return {
            title,

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

    // endregion
}

export default new PlayerObserver();
