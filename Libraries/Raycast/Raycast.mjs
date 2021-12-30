//https://gamedev.stackexchange.com/a/49423

/*
When I had this problem while working on my Cubes, I found the paper "A
Fast Voxel Traversal Algorithm for Ray Tracing" by John Amanatides and
Andrew Woo, 1987 which describes an algorithm which can be applied to this
task; it is accurate and needs only one loop iteration per voxel intersected.

I have written an implementation of the relevant parts of the paper's
algorithm in JavaScript. My implementation adds two features: it allows
specifying a limit on the distance of the raycast (useful for avoiding
performance issues as well as defining a limited 'reach'), and also computes
which face of each voxel the ray entered.

The input origin vector must be scaled such that the side length of a voxel
is 1. The length of the direction vector is not significant but may affect
the numerical accuracy of the algorithm.

The algorithm operates by using a parameterized representation of the ray,
origin + t * direction. For each coordinate axis, we keep track of the t
value which we would have if we took a step sufficient to cross a voxel
boundary along that axis (i.e. change the integer part of the coordinate)
in the variables tMaxX, tMaxY, and tMaxZ. Then, we take a step (using the
step and tDelta variables) along whichever axis has the least tMax — i.e.
whichever voxel-boundary is closest.
*/


/**
 * Call the callback with (x,y,z,value,face) of all blocks along the line
 * segment from point 'origin' in vector direction 'direction' of length
 * 'radius'. 'radius' may be infinite.
 *
 * 'face' is the normal vector of the face of that block that was entered.
 * It should not be used after the callback returns.
 *
 * If the callback returns a true value, the traversal will be stopped.
 */
export default function Raycast(origin, direction, radius, callback) {
  // From "A Fast Voxel Traversal Algorithm for Ray Tracing"
  // by John Amanatides and Andrew Woo, 1987
  // <http://www.cse.yorku.ca/~amana/research/grid.pdf>
  // <http://citeseer.ist.psu.edu/viewdoc/summary?doi=10.1.1.42.3443>
  // Extensions to the described algorithm:
  //   • Imposed a distance limit.
  //   • The face passed through to reach the current cube is provided to
  //     the callback.

  // The foundation of this algorithm is a parameterized representation of
  // the provided ray,
  //                    origin + t * direction,
  // except that t is not actually stored; rather, at any given point in the
  // traversal, we keep track of the *greater* t values which we would have
  // if we took a step sufficient to cross a cube boundary along that axis
  // (i.e. change the integer part of the coordinate) in the variables
  // tMaxX, tMaxY, and tMaxZ.

  // Cube containing origin point.
  var x = Math.floor(origin[0]);
  var y = Math.floor(origin[1]);
  var z = Math.floor(origin[2]);
  // Break out direction vector.
  var dx = direction[0];
  var dy = direction[1];
  var dz = direction[2];
  // Direction to increment x,y,z when stepping.
  var stepX = signum(dx);
  var stepY = signum(dy);
  var stepZ = signum(dz);
  // See description above. The initial values depend on the fractional
  // part of the origin.
  var tMaxX = intbound(origin[0], dx);
  var tMaxY = intbound(origin[1], dy);
  var tMaxZ = intbound(origin[2], dz);
  // The change in t when taking a step (always positive).
  var tDeltaX = stepX/dx;
  var tDeltaY = stepY/dy;
  var tDeltaZ = stepZ/dz;
  // Buffer for reporting faces to the callback.

  //var face = vec3.create();
  var face = [0, 0, 0];

  // Avoids an infinite loop.
  if (dx === 0 && dy === 0 && dz === 0)
    throw new RangeError("Raycast in zero direction!");

  // Rescale from units of 1 cube-edge to units of 'direction' so we can
  // compare with 't'.
  radius /= Math.sqrt(dx*dx+dy*dy+dz*dz);

  while (true) {

    // Invoke the callback.
    if (callback(x, y, z, face)) return {"X": x, "Y": y, "Z": z, "Face": face, "Distance": Math.sqrt((origin[0] - x) ** 2 + (origin[1] - y) ** 2 + (origin[2] - z) ** 2)};

    // tMaxX stores the t-value at which we cross a cube boundary along the
    // X axis, and similarly for Y and Z. Therefore, choosing the least tMax
    // chooses the closest cube boundary. Only the first case of the four
    // has been commented in detail.
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > radius) return null;
        // Update which cube we are now in.
        x += stepX;
        // Adjust tMaxX to the next X-oriented boundary crossing.
        tMaxX += tDeltaX;
        // Record the normal vector of the cube face we entered.
        face[0] = -stepX;
        face[1] = 0;
        face[2] = 0;
      } else {
        if (tMaxZ > radius) return null;
        z += stepZ;
        tMaxZ += tDeltaZ;
        face[0] = 0;
        face[1] = 0;
        face[2] = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        if (tMaxY > radius) return null;
        y += stepY;
        tMaxY += tDeltaY;
        face[0] = 0;
        face[1] = -stepY;
        face[2] = 0;
      } else {
        // Identical to the second case, repeated for simplicity in
        // the conditionals.
        if (tMaxZ > radius) return null;
        z += stepZ;
        tMaxZ += tDeltaZ;
        face[0] = 0;
        face[1] = 0;
        face[2] = -stepZ;
      }
    }
  }
}

function intbound(s, ds) {
  // Find the smallest positive t such that s+t*ds is an integer.
  if (ds < 0) {
    return intbound(-s, -ds);
  } else {
    s = mod(s, 1);
    // problem is now s+t*ds = 1
    return (1-s)/ds;
  }
}

function signum(x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

function mod(value, modulus) {
  return (value % modulus + modulus) % modulus;
}
