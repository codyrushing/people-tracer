import glVec2 from 'gl-vec2';

export const createVector = (x : number,y : number) => glVec2.set(glVec2.create(), x, y)

export const vectorDifference = ([x0, y0], [dx, dy]) => glVec2.sub(
  glVec2.create(),
  createVector(x0, y0),
  createVector(dx, dy)
);
