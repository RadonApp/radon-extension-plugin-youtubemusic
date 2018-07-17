import IsNil from 'lodash-es/isNil';

import {awaitBody, awaitElements} from 'neon-extension-framework/Document/Await';

import Log from '../Core/Logger';


export function awaitPlayer() {
    return new Promise((resolve, reject) => {
        Log.debug('Waiting for player to load...');

        // Display loading warning every 60s
        let loadingInterval = setInterval(() => {
            Log.warn('Waiting for player to load...');
        }, 60 * 1000);

        // Wait for page to load
        awaitBody().then(() => awaitElements(
            document.body,
            '#movie_player'
        )).then((element) => {
            Log.info('Player loaded');

            // Cancel loading warning
            clearInterval(loadingInterval);

            // Resolve promise
            resolve(element);
        }, (err) => {
            // Cancel loading warning
            clearInterval(loadingInterval);

            // Reject promise
            reject(err);
        });
    });
}

export function getIdentifier(value) {
    if(IsNil(value) || value.length < 1) {
        return null;
    }

    // Find identifier position
    let pos = value.lastIndexOf('/');

    if(pos < 0) {
        return null;
    }

    // Return identifier
    return value.substring(pos + 1) || null;
}
