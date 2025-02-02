import { fabric } from 'fabric';

const DEFAULT_SVG_OPTIONS = {
  left: 100,
  top: 100,
  fill: '#000000',
  scaleX: 0.5,
  scaleY: 0.5
};

export function createSvgPath(pathData: string): fabric.Path {
  return new fabric.Path(pathData, DEFAULT_SVG_OPTIONS);
}