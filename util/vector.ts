import glVec2 from 'gl-vec2';

export type Vector2 = [number, number];

export const createVector = (x : number, y : number) => glVec2.set(glVec2.create(), x, y)

export function vectorDifference([x0, y0] : Vector2, [x1, y1] : Vector2) : Vector2 {
  return glVec2.sub(
    glVec2.create(),
    createVector(x0, y0),
    createVector(x1, y1)
  );
}