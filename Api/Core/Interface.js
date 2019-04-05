/* eslint-disable key-spacing */
import IsNil from 'lodash-es/isNil';
import URI from 'urijs';

import {fetch} from '@radon-extension/framework/Core/Fetch';

import YouTubeMusicShim from '../Shim';


export default class Interface {
    static url = 'https://music.youtube.com/youtubei/v1';

    constructor() {
        this.interfaces = {};
    }

    get url() {
        return this.constructor.url;
    }

    get shim() {
        return YouTubeMusicShim;
    }

    get(url, options) {
        return this.request('GET', url, options);
    }

    post(url, options) {
        return this.request('POST', url, options);
    }

    put(url, options) {
        return this.request('PUT', url, options);
    }

    request(method, url, options) {
        if(!this.shim.injected) {
            return Promise.reject(new Error(
                'Shim hasn\'t been injected yet'
            ));
        }

        // Set default options
        options = {
            authenticated: false,

            body: null,
            headers: {},
            params: {},

            ...(options || {})
        };

        // Add URL Base
        if(url.indexOf('://') < 0) {
            url = `${this.constructor.url}/${url}`;
        }

        // Add URL Parameters
        url = URI(url)
            .search(options.params)
            .addSearch('alt', 'json');

        // Build request
        return Promise.resolve()
            // Add authentication details (if enabled)
            .then(() => {
                if(!options.authenticated) {
                    return Promise.resolve();
                }

                // Retrieve configuration
                return YouTubeMusicShim.configuration().then((config) => {
                    // Add key to URL
                    url.addSearch('key', config['INNERTUBE_API_KEY']);

                    // Update headers
                    options.headers = {
                        ...options.headers,
                        ...this._createHeaders(config)
                    };

                    // Update body
                    if(!IsNil(options.body)) {
                        options.body.context = this._createContext(config);
                    }
                });
            })
            // Send request
            .then(() => this.send(method, url.toString(), {
                headers: options.headers,
                body: !IsNil(options.body) ? JSON.stringify(options.body) : null
            }));
    }

    send(method, url, options) {
        return fetch(url, {
            method,
            ...options
        }).then((response) => {
            if(!response.ok) {
                return Promise.reject(new Error(
                    `Request error (code: ${response.status})`
                ));
            }

            return response.json().catch(() => null);
        });
    }

    _createContext(config) {
        return {
            capabilities: {},

            client: {
                clientName:     config['INNERTUBE_CLIENT_NAME'],
                clientVersion:  config['INNERTUBE_CLIENT_VERSION'],
                experimentIds:  [],
                gl:             config['GL'],
                hl:             config['HL'],
                utcOffsetMinutes: 720,

                locationInfo: {
                    locationPermissionAuthorizationStatus: 'LOCATION_PERMISSION_AUTHORIZATION_STATUS_UNSUPPORTED'
                },

                musicAppInfo: {
                    musicActivityMasterSwitch: 'MUSIC_ACTIVITY_MASTER_SWITCH_INDETERMINATE',
                    musicLocationMasterSwitch: 'MUSIC_LOCATION_MASTER_SWITCH_ENABLED'
                }
            },

            request: {
                internalExperimentFlags: []
            },

            user: {
                enableSafetyMode: false
            }
        };
    }

    _createHeaders(config) {
        return {
            'X-Goog-Visitor-Id':        config['VISITOR_DATA'],
            'X-Goog-AuthUser':          config['SESSION_INDEX'],

            'X-YouTube-Client-Name':    config['INNERTUBE_CONTEXT_CLIENT_NAME'],
            'X-YouTube-Client-Version': config['INNERTUBE_CONTEXT_CLIENT_VERSION'],
            'X-Youtube-Identity-Token': config['ID_TOKEN'],
            'X-YouTube-Page-CL':        config['PAGE_CL'],
            'X-YouTube-Page-Label':     config['PAGE_BUILD_LABEL'],
            'X-YouTube-Utc-Offset':     720,

            'x-origin':                 'https://music.youtube.com'
        };
    }
}
