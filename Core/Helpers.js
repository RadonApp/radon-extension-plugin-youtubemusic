/* eslint-disable no-console */
import IsNil from 'lodash-es/isNil';

import {awaitBody, awaitElements} from '@radon-extension/framework/Document/Await';


export function awaitPlayer() {
    return new Promise((resolve, reject) => {
        console.debug('Waiting for player to load...');

        // Display loading warning every 60s
        let loadingInterval = setInterval(() => {
            console.warn('Waiting for player to load...');
        }, 60 * 1000);

        // Wait for page to load
        awaitBody().then(() => awaitElements(
            document.body,
            '#movie_player'
        )).then((element) => {
            console.info('Player loaded');

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
