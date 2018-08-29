import SourcePlugin from '@radon-extension/framework/Models/Plugin/Source';


export class YouTubeMusicPlugin extends SourcePlugin {
    constructor() {
        super('youtubemusic');
    }
}

export default new YouTubeMusicPlugin();
