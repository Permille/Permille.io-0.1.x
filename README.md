# Permille.io
Public repository for the Permille.io voxel game.

## How to run
This is a web application that requires Google Chrome >= 86 or
some other Chromium based browser to run. For Chrome >= 92, it
is required to serve these files from a https server that sets
the COOP and COEP headers to allow for the usage of SharedArrayBuffers
and other advanced features: https://developer.chrome.com/blog/enabling-shared-array-buffer/.
It is possible to run this from localhost without https or setting those headers.\
These requirements are likely to change in the future.

## Features
The latest version (0.1.9.3) is a mesh-based renderer with integrated LODs.
I plan on creating a raytraced voxel rendering prototype by February 2022.

## Licence
This project is licenced with CC BY-NC-SA 4.0. For more information,
visit https://creativecommons.org/licenses/by-nc-sa/4.0/ .
There is an older, MIT licenced version of this project (version 0.1.4.5)
which can be found at https://github.com/Permille/VoxelEngine . In the
future, I plan on re-licencing major versions that are over a year old
with a less restrictive licence: when made available, those will be foun
in the afore-mentioned repository. Please note that the new licence will
only apply after the version is made available in that repository.\
This licence does not apply to the contents of the "Libraries" directory;
for those files, the original licences of the projects apply.
