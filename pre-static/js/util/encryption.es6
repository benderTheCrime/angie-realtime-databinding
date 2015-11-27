/**
 * @module encryption.js
 * @author Joe Groseclose <@benderTheCrime>
 * @date 11/25/2015
 */

class AngieCrypto {
    static cipher(s = '', key) {
        let str = '',
            ord = [],
            z;

        for (z = 1; z <= 255; z++) {
            ord[ String.fromCharCode(z) ] = z;
        }

        for (let j = z = 0; z < s.length; z++) {
            str += String.fromCharCode(
                ord[ s.substr(z, 1) ] ^ ord[ key.substr(j, 1) ]
            );
            j = (j < key.length) ? j + 1 : 0;
        }

        return str;
    }
    static encrypt(s, k) {
        try {
            if (typeof s !== 'string') {
                s = JSON.stringify(s);
            }
        } catch(e) {}
        return this.cipher(encodeURIComponent(escape(s)), k);
    }
    static decrypt(s, k) {
        let result = decodeURIComponent(unescape(this.cipher(s, k)));
        try {
            if (typeof result === 'string' && /]|{/.test(result)) {
                result = JSON.parse(result);
            }
        } catch(e) {}

        return result;
    }
}

export default AngieCrypto;