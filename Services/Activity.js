import Get from 'lodash-es/get';
import IsNil from 'lodash-es/isNil';
import {Cache} from 'memory-cache';

import ActivityService, {ActivityEngine} from '@radon-extension/framework/Services/Source/Activity';
import Registry from '@radon-extension/framework/Core/Registry';
import {Artist} from '@radon-extension/framework/Models/Metadata/Music';
import {matchItemByTitle} from '@radon-extension/framework/Utilities/Metadata';

import Api from '../Api';
import Log from '../Core/Logger';
import PlayerMonitor from '../Player/Monitor';
import Plugin from '../Core/Plugin';
import ShimApi from '../Api/Shim';
import {getIdentifier} from '../Core/Helpers';


const AlbumCacheExpiry = 3 * 60 * 60 * 1000;  // 3 hours

export class YouTubeMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.player = new PlayerMonitor();
        this.engine = null;

        this.albums = new Cache();
    }

    initialize() {
        super.initialize();

        // Construct activity engine
        this.engine = new ActivityEngine(this.plugin, {
            getMetadata: this.getMetadata.bind(this),

            isEnabled: () => true
        });

        // Bind activity engine to player monitor
        this.engine.bind(this.player);

        // Inject shim
        return ShimApi.inject().then(() => {
            Log.trace('Configuration received');

            // Start monitoring player
            this.player.start();
        }).catch((err) => {
            Log.error('Unable to inject shim: %s', err.message, err);
        });
    }

    getMetadata(item) {
        let albumId = item.album && Get(item.album.keys, [Plugin.id, 'id']);

        if(IsNil(albumId)) {
            return Promise.resolve(item);
        }

        let fetchedAt = Date.now();

        // Update item `fetchedAt` timestamp
        item.update(Plugin.id, { fetchedAt });

        // Fetch album metadata
        Log.debug('Fetching metadata for album "%s" (track: %o)', albumId, item);

        return this.fetchAlbum(albumId).then((album) => {
            // Update album
            item.album.update(Plugin.id, {
                fetchedAt
            });

            // Create album artist (if available)
            if(!IsNil(album.primaryArtists) && album.primaryArtists.length > 0) {
                if(IsNil(item.album.artist)) {
                    item.album.artist = new Artist();
                }

                item.album.artist.update(Plugin.id, {
                    keys: {
                        id: getIdentifier(album.primaryArtists[0].id)
                    },

                    // Metadata
                    title: album.primaryArtists[0].name,

                    // Timestamps
                    fetchedAt
                });
            } else if(!IsNil(album.artistDisplayName)) {
                if(IsNil(item.album.artist)) {
                    item.album.artist = new Artist();
                }

                item.album.artist.update(Plugin.id, {
                    // Metadata
                    title: album.artistDisplayName,

                    // Timestamps
                    fetchedAt
                });
            } else {
                Log.warn('No artist found in album:', album);
            }

            // Find matching track
            let track = matchItemByTitle(album.details.tracks, item.title);

            if(IsNil(track)) {
                return Promise.reject(new Error(
                    'Unable to find track "' + item.title + '" in album "' + item.album.title + '"'
                ));
            }

            Log.trace('Matched "%s" with track: %o', item.title, track);

            // Update item
            item.update(Plugin.id, {
                number: parseInt(track.albumTrackIndex, 10)
            });

            return item;
        });
    }

    fetchAlbum(albumId) {
        if(IsNil(albumId) || albumId.length <= 0) {
            return Promise.reject();
        }

        // Retrieve album from cache
        let album = this.albums.get(albumId);

        if(!IsNil(album)) {
            return Promise.resolve(album);
        }

        // Fetch album
        return Api.entity.fetchAlbum(albumId).then((album) => {
            // Store album in cache (which is automatically removed in `AlbumCacheExpiry`)
            this.albums.put(albumId, album, AlbumCacheExpiry);

            // Return album
            return album;
        });
    }
}

// Register service
Registry.registerService(new YouTubeMusicActivityService());
