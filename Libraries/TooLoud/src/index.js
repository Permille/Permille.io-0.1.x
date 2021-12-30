/*
    Perlin noise implementation taken from http://mrl.nyu.edu/~perlin/noise/
    Simplex noise implementation taken from http://www.csee.umbc.edu/~olano/s2002c36/ch02.pdf
    Worley noise implementation taken from https://aftbit.com/cell-noise-2/
*/
import Perlin from './Perlin.js';
import Simplex from './Simplex.js';
import Worley from './Worley.js';
import Fractal from './Fractal.js';

const perlin = new Perlin();
const simplex = new Simplex();
const worley = new Worley();

export let Noises = {
    Perlin: {
        noise: perlin.noise,
        setSeed: perlin.setSeed,
        create: seed => new Perlin(seed)
    },

    Simplex: {
        noise: simplex.noise,
        setSeed: simplex.setSeed,
        create: seed => new Simplex(seed)
    },

    Worley: {
        Euclidean: worley.Euclidean,
        Manhattan: worley.Manhattan,
        setSeed: worley.setSeed,
        create: seed => new Worley(seed)
    },

    Fractal: {
        noise: Fractal.noise
    }
};