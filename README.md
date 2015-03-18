# SPACE - an experimental canvas rendering framework

***

## Introduction

Space is aimed firstly at the limited application of rendering 2D sprites in 3D space on HTML5 canvas, using only
function calls that are supported by FlashCanvas so that the resulting animations can fall back to Flash for IE<9.

It also supports drawing basic meshes, and meshes and sprites can be used together.

The idea was to make switches between 2D and 3D canvas rendering contexts transparent, but the full 2D feature set has
not been implemented for the 3D context as there are better renderers out there for WebGL.

## Examples

The first example, index.html, shows basic sprite rendering. The 2nd example, index2.html, shows mesh rendering.

## Performance

The framework has been used on production sites running back to IE8, rendering and animating up to 800 sprites
interlinked with meshes on IE8, and up to 6000 sprites interlinked with meshes on modern browsers.