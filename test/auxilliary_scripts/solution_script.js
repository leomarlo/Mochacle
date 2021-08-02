//........................
// raises a to the power of b.  
function pow (a,b) {
    if (a<0) {
        return NaN;
    }
    return a ** b 
}    
// hello world in different languages. German and Spanish language.      
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

// export modules
module.exports = {
    pow,
    helloworld,
};

// end of script.........