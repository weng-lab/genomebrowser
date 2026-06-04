import type { ComponentType } from "react";
import Draggable, { type DraggableProps } from "react-draggable";

const TypedDraggable = Draggable as unknown as ComponentType<Partial<DraggableProps>>;

export default TypedDraggable;
