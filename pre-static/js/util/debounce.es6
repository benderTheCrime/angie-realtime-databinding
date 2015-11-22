/**
 * @module angie-binding.es6
 * @author Joe Groseclose <@benderTheCrime>
 * @date 10/25/2015
 */

// Largely adapted from: https://davidwalsh.name/javascript-debounce-function
// CO: David Walsh
const debounce = function(fn, delay) {
    let timer = null;
    return function () {
        let context = this,
            args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
};

export default debounce;