import EntityParser, {EntityTypes} from './EntityParser';


describe('EntityParser', () => {
    describe('parse', () => {
        it('should parse album release', () => {
            expect(EntityParser.parse(EntityTypes.AlbumRelease, [
                {
                    'payload': {
                        'musicAlbumRelease': {
                            'id': 'ALBUM_RELEASE',
                            'title': 'Humility',

                            'artistDisplayName': 'Gorillaz & George Benson',
                            'durationMs': '197933',
                            'releaseDate': { 'year': 2018, 'month': 5, 'day': 31 },
                            'releaseType': 'MUSIC_RELEASE_TYPE_SINGLE',
                            'trackCount': '1',

                            'primaryArtists': [ 'ARTIST' ],

                            'details': 'ALBUM_RELEASE_DETAIL',
                            'userDetails': 'ALBUM_RELEASE_USER_DETAIL'
                        }
                    }
                },
                {
                    'payload': {
                        'musicAlbumReleaseDetail': {
                            'id': 'ALBUM_RELEASE_DETAIL',

                            'tracks': [
                                'TRACK'
                            ]
                        }
                    }
                },
                {
                    'payload': {
                        'musicAlbumReleaseUserDetail': {
                            'id': 'ALBUM_RELEASE_USER_DETAIL',
                            'inLibrary': true,

                            'albumRelease': 'ALBUM_RELEASE'
                        }
                    }
                },
                {
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
                    'payload': {
                        'musicTrack': {
                            'id': 'TRACK',
                            'title': 'Humility (feat. George Benson)',

                            'albumTrackIndex': '1',
                            'artistNames': 'Gorillaz',
                            'lengthMs': '197933',

                            'albumRelease': 'ALBUM_RELEASE',
                            'userDetails': 'TRACK_USER_DETAIL',
                            'details': 'TRACK_DETAIL'
                        }
                    }
                },
                {
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
                'title': 'Humility',

                'artistDisplayName': 'Gorillaz & George Benson',
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
                            }
                        }
                    ]
                },

                'userDetails': {
                    'id': 'ALBUM_RELEASE_USER_DETAIL',
                    'inLibrary': true,

                    'albumRelease': 'ALBUM_RELEASE'
                }
            });
        });
    });
});
