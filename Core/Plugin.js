import SourcePlugin from 'neon-extension-framework/Models/Plugin/Source';


export class YouTubeMusicPlugin extends SourcePlugin {
    constructor() {
        super('youtubemusic');
    }
}

export default new YouTubeMusicPlugin();
