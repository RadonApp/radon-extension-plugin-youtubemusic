/* eslint-disable key-spacing */
import Find from 'lodash-es/find';
import ForEach from 'lodash-es/forEach';
import Get from 'lodash-es/get';
import IsUndefined from 'lodash-es/isUndefined';
import IsNil from 'lodash-es/isNil';
import IsString from 'lodash-es/isString';
import Map from 'lodash-es/map';
import Set from 'lodash-es/set';

import Log from '../Core/Logger';


export const EntityTypes = {
    AlbumRelease: 'albumRelease',
    AlbumReleaseDetail: 'albumReleaseDetail',
    AlbumReleaseUserDetail: 'albumReleaseUserDetail',

    Artist: 'artist',

    Track: 'track',
    TrackUserDetail: 'trackUserDetail'
};

export const EntityStructure = {
    [EntityTypes.AlbumRelease]: {
        [EntityTypes.AlbumRelease]:             null,
        [EntityTypes.AlbumReleaseDetail]:       'details',
        [EntityTypes.AlbumReleaseUserDetail]:   'userDetails',

        [EntityTypes.Artist]:                   'primaryArtists',

        [EntityTypes.Track]:                    'details.tracks',

        [EntityTypes.TrackUserDetail]:          {
            parent: 'details.tracks',
            path: 'userDetails',

            match: (data, item) => (
                data.parentTrack === item.id
            )
        }
    }
};

export class EntityParser {
    parse(type, payloads) {
        let structure = EntityStructure[type];

        // Ensure item structure exists
        if(IsNil(structure)) {
            throw new Error(`Unsupported type: "${type}"`);
        }

        let item = null;

        // Parse payloads
        ForEach(payloads, (payload) => {
            let target = item;

            // Parse payload
            let { parent, path, match, data } = this._parsePayload(structure, payload);

            if(IsUndefined(path)) {
                Log.warn('Ignoring unsupported payload:', payload);
                return;
            }

            // Process item
            if(IsNil(path)) {
                if(!IsNil(item)) {
                    throw new Error('Item already parsed');
                }

                // Update item
                item = data;
                return;
            }

            // Find parent
            if(!IsNil(parent)) {
                target = Get(target, parent);

                if(IsNil(target)) {
                    throw new Error(`Unable to find parent: ${parent}`);
                }
            }

            // Find match
            if(!IsNil(match)) {
                if(!Array.isArray(target)) {
                    throw new Error('Unable to find match, expected an array');
                }

                // Find match
                target = Find(target, (item) => match(data, item));

                if(IsNil(target)) {
                    throw new Error('Unable to find match');
                }
            }

            // Retrieve identifier from path
            let value = Get(target, path);

            if(IsNil(value)) {
                Log.warn(`No identifier found at "${path}", ignoring payload:`, payload);
                return;
            }

            // Process child
            if(Array.isArray(value)) {
                Set(target, path, Map(value, (id) => {
                    if(data.id === id) {
                        return data;
                    }

                    return id;
                }));
            } else {
                if(data.id !== value) {
                    throw new Error(`Invalid item (expected "${value}", found "${data.id}")`);
                }

                // Update value
                Set(target, path, data);
            }
        });

        return item;
    }

    _parsePayload(structure, payload) {
        let keys = Object.keys(payload);

        if(keys.length < 1) {
            throw new Error('Invalid payload');
        }

        let result = structure[keys[0]];

        if(IsString(result)) {
            result = { path: result };
        }

        return {
            parent: null,
            path: null,
            match: null,

            ...result,

            data: payload[keys[0]]
        };
    }
}

export default new EntityParser();
