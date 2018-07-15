import IsNil from 'lodash-es/isNil';

import Interface from './Core/Interface';
import EntityParser, {EntityTypes} from './EntityParser';


export default class EntityInterface extends Interface {
    browse(entityId) {
        return this.post('entity_browse', {
            pageId: 'DETAIL',
            entityId
        }).then(({ payload: { payloads } }) => {
            if(!IsNil(entityId.musicAlbumReleaseEntity)) {
                return EntityParser.parse(EntityTypes.AlbumRelease, payloads);
            }

            throw new Error('Unknown entity type');
        });
    }
}
