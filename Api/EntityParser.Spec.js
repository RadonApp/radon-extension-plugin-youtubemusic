import EntityParser, {EntityTypes} from './EntityParser';


describe('EntityParser', () => {
    describe('parse', () => {
        it('should parse album release', () => {
            expect(EntityParser.parse(EntityTypes.AlbumRelease, [
                {
                    'entityKey': 'ALBUM_RELEASE',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicAlbumRelease': {
                            'id': 'ALBUM_RELEASE',
                            'title': 'Humility (feat. George Benson)',

                            'artistDisplayName': 'Gorillaz',
                            'durationMs': '197933',
                            'releaseDate': { 'year': 2018, 'month': 5, 'day': 31 },
                            'releaseType': 'MUSIC_RELEASE_TYPE_SINGLE',
                            'trackCount': '1',

                            'primaryArtists': [ 'ARTIST' ],

                            'details': 'ALBUM_RELEASE_DETAIL',
                            'userDetails': 'ALBUM_RELEASE_USER_DETAIL',
                            'share': 'ALBUM_RELEASE_SHARE'
                        }
                    }
                },
                {
                    'entityKey': 'ALBUM_RELEASE_DETAIL',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicAlbumReleaseDetail': {
                            'id': 'ALBUM_RELEASE_DETAIL',

                            'description': '',
                            'tracks': [
                                'TRACK'
                            ]
                        }
                    }
                },
                {
                    'entityKey': 'ALBUM_RELEASE_USER_DETAIL',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicAlbumReleaseUserDetail': {
                            'id': 'ALBUM_RELEASE_USER_DETAIL',
                            'inLibrary': true,

                            'albumRelease': 'ALBUM_RELEASE'
                        }
                    }
                },
                {
                    'entityKey': 'ARTIST',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicArtist': {
                            'id': 'ARTIST',
                            'name': 'Gorillaz',

                            'details': 'ARTIST_DETAIL',
                            'userDetails': 'ARTIST_USER_DETAIL'
                        }
                    }
                },
                {
                    'entityKey': 'TRACK_SHARE',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicShare': {
                            'id': 'TRACK_SHARE',
                            'serializedShareEntity': 'TRACK_SHARE_SERIALIZED'
                        }
                    }
                },
                {
                    'entityKey': 'ALBUM_RELEASE_SHARE',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicShare': {
                            'id': 'ALBUM_RELEASE_SHARE',
                            'serializedShareEntity': 'ALBUM_RELEASE_SHARE_SERIALIZED'
                        }
                    }
                },
                {
                    'entityKey': 'TRACK',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicTrack': {
                            'id': 'TRACK',
                            'title': 'Humility (feat. George Benson)',

                            'albumTrackIndex': '1',
                            'artistNames': 'Gorillaz',
                            'lengthMs': '197933',

                            'albumRelease': 'ALBUM_RELEASE',
                            'userDetails': 'TRACK_USER_DETAIL',
                            'details': 'TRACK_DETAIL',
                            'share': 'TRACK_SHARE'
                        }
                    }
                },
                {
                    'entityKey': 'TRACK_USER_DETAIL',
                    'type': 'ENTITY_MUTATION_TYPE_REPLACE',
                    'payload': {
                        'musicTrackUserDetail': {
                            'id': 'TRACK_USER_DETAIL',
                            'likeState': 'MUSIC_ENTITY_LIKE_STATE_LIKED',

                            'parentTrack': 'TRACK'
                        }
                    }
                }
            ])).toEqual({
                'id': 'ALBUM_RELEASE',
                'title': 'Humility (feat. George Benson)',

                'artistDisplayName': 'Gorillaz',
                'durationMs': '197933',
                'releaseDate': { 'year': 2018, 'month': 5, 'day': 31 },
                'releaseType': 'MUSIC_RELEASE_TYPE_SINGLE',
                'trackCount': '1',

                'primaryArtists': [
                    {
                        'id': 'ARTIST',
                        'name': 'Gorillaz',

                        'details': 'ARTIST_DETAIL',
                        'userDetails': 'ARTIST_USER_DETAIL'
                    }
                ],

                'details': {
                    'id': 'ALBUM_RELEASE_DETAIL',
                    'description': '',

                    'tracks': [
                        {
                            'id': 'TRACK',
                            'title': 'Humility (feat. George Benson)',

                            'albumTrackIndex': '1',
                            'artistNames': 'Gorillaz',
                            'lengthMs': '197933',

                            'albumRelease': 'ALBUM_RELEASE',
                            'details': 'TRACK_DETAIL',

                            'userDetails': {
                                'id': 'TRACK_USER_DETAIL',
                                'likeState': 'MUSIC_ENTITY_LIKE_STATE_LIKED',

                                'parentTrack': 'TRACK'
                            },

                            share: 'TRACK_SHARE'
                        }
                    ]
                },

                'userDetails': {
                    'id': 'ALBUM_RELEASE_USER_DETAIL',
                    'inLibrary': true,

                    'albumRelease': 'ALBUM_RELEASE'
                },

                share: 'ALBUM_RELEASE_SHARE'
            });
        });
    });
});
