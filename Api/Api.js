import EntityInterface from './Entity';
import Interface from './Core/Interface';


export default class YouTubeMusicApi extends Interface {
    constructor() {
        super();

        // Create children
        this.interfaces = {
            entity: new EntityInterface()
        };
    }

    get entity() {
        return this.interfaces.entity;
    }
}
