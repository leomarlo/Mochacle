// submission

function pow (a,b) {
    if (a<0) {
        return NaN;
    }
    return a ** b
}

function helloworld (language) {
    if (language=="german") {
        return "Hallo Welt"
    }
    else if (language=="spanish") {
        return "Hola Mundo"
    }
    else {
        return "Hello World"
    }
}

module.exports = {
    pow,
    helloworld,
};