# Track interactions live on configs

v2 keeps interaction callbacks and tooltips on track configs, with module defaults allowed, because generated configs are the runtime unit inserted into the track store. This preserves the simple core workflow where UI code can build a complete track config and add it to the store, while semantic wrapper modules can still provide default interactions or tooltips for specialized track types such as cCRE BigBed tracks.
