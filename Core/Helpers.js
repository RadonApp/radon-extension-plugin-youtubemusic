import IsNil from 'lodash-es/isNil';


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
