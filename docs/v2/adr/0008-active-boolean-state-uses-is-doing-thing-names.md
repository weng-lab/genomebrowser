# Active boolean state uses isDoingThing names

v2 active boolean state should use `isDoingThing` names, such as `isDragging`, `isFetching`, or `isSelecting`, instead of bare participles like `dragging`, `fetching`, or `selecting`. This makes boolean state read clearly at call sites, distinguishes state from actions or status values, and keeps naming consistent as v2 browser interactions and data loading code grow.
