/**
 * @module encryption.js
 * @author Joe Groseclose <@benderTheCrime>
 * @date 11/25/2015
 */

class AngieCrypto {
    static encrypt(s = '', key) {
        let str = '';

        console.log('in encrypt');
        // s = s.toString('utf8');
        try {
            s = JSON.stringify(s);
        } catch(e) {}

        console.log('s', typeof s);
        for (let i = 0; i < s.length; ++i) {
            let a = s.charCodeAt(i),
                b = a ^ key;
            console.log('ab', a, b);
            str = str + String.fromCharCode(b);
        }
        console.log('B5', str.toString('base64'));
        try {
            return JSON.parse(str);
        } catch(e) {
            return str;
        }
    }
    static decrypt() {
        return this.encrypt.apply(this, arguments);
    }
}

export default AngieCrypto;