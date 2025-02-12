import { type Diagram } from './diagram.js';
import { boards } from './boards.js';

export function findBoard(diagram: Diagram) {
  return diagram.parts?.find((part) => boards.some((b) => b.board === part.type));
}
