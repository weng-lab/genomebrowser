# Internal stores are overridable

v2 browser-owned stores should be created internally by default, but exposed as optional overrides when consumers need to customize browser behavior such as settings modal UI. Stores that require startup domain input, such as `browserStore` and `trackStore`, remain externally initialized because the browser cannot construct them without region, module, and track data.
