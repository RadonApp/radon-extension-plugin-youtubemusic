import Interface from './Core/Interface';
import EntityParser, {EntityTypes} from './EntityParser';


export default class EntityInterface extends Interface {
    fetchAlbum(albumId) {
        return this.post('browse', {
            authenticated: true,

            body: {
                browseEndpointContextSupportedConfigs: {
                    browseEndpointContextMusicConfig: {
                        pageType: 'MUSIC_PAGE_TYPE_ALBUM'
                    }
                },
                browseId: albumId
            }
        }).then(({ frameworkUpdates: { entityBatchUpdate: { mutations } } }) => {
            return EntityParser.parse(EntityTypes.AlbumRelease, mutations);
        });
    }
}
