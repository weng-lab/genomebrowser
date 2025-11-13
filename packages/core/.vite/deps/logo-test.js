import {
  require_react
} from "./chunk-CRTYDVI6.js";
import {
  __commonJS,
  __toESM
} from "./chunk-5WRI5ZAA.js";

// node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    (function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e2) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          maybeKey,
          getOwner(),
          debugStack,
          debugTask
        );
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      var React = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(
        React,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    })();
  }
});

// node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// node_modules/.pnpm/logo-test@0.0.5_react-dom@19.2.0_react@19.2.0__react@19.2.0/node_modules/logo-test/dist/logo-test.es.js
var import_jsx_runtime = __toESM(require_jsx_runtime());
var _0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 10 20 C 5 -5 95 -10 100 35 L 100 100 L 80 100 L 80 90 C 90 105 10 105 0 80 C 0 45 40 40 60 45 L 80 50 C 95 30 40 5 10 35",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { fill: "#ffffff", d: "M 77 70 C 70 90 30 90 22 80 C 10 50 80 60 77 70" })
] });
var A0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 20 0 L 0 0 L 0 100 L 20 100 L 20 80 C 10 110 90 110 100 70 L 100 60 C 90 10 10 10 20 40 L 20 40 L 20 0",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 79 60 C 80 95 20 95 20 65 C 20 30 80 30 79 65", fill: "#ffffff" })
] });
var N0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 80 0 L 100 0 L 100 100 L 80 100 L 80 80 C 90 110 10 110 0 70 L 0 60 C 10 10 90 10 80 40 L 80 40 L 80 0",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 79 60 C 80 95 20 95 20 65 C 20 30 80 30 79 65", fill: "#ffffff" })
] });
var w0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 25 50 L 100 50 C 85 -17 15 -17 0 50 C 0 75 25 100 50 100 L 95 100 L 95 80 L 50 80 Q 25 70 25 50",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 33 37 L 68 37 C 58 10 42 10 33 37", fill: "#ffffff" })
] });
var E0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 95 32 C 80 -17 20 -5 20 37 L 7 37 L 7 50 L 20 50 L 20 100 L 45 100 L 45 50 L 57 50 L 57 37 L 45 37 C 45 10 70 10 75 32 L 95 32",
    ...o
  }
);
var S0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 100 15 L 100 0 L 80 0 L 80 15 C 85 -8 15 -8 0 25 C 2 75 80 75 80 50 L 75 65 C 65 85 45 85 10 75 L 10 90 C 25 110 85 110 100 75 L 100 25",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 67 30 C 70 10 25 10 27 30 C 25 50 70 50 67 30", fill: "#ffffff" })
] });
var v0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 0 100 L 20 100 L 20 80 C 20 40 80 40 80 80 L 80 100 L 100 100 L 100 50 C 80 20 20 20 20 45 L 20 0 L 0 0",
    ...o
  }
);
var O0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "rect",
    {
      ...o,
      x: 40,
      y: 20,
      width: 20,
      height: 80
    }
  ),
  (0, import_jsx_runtime.jsx)(
    "rect",
    {
      ...o,
      x: 40,
      y: 0,
      width: 20,
      height: 15
    }
  )
] });
var T0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 0 60 C 0 115 100 115 100 60 L 100 20 L 80 20 L 80 60 C 80 90 20 90 25 60",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 0 60 L 100 20", ...o })
] });
var z0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 20 0 L 20 60 L 75 30 L 100 30 L 50 65 L 100 100 L 75 100 L 27 80 L 20 85 L 20 100 L 0 100 L 0 0",
    ...o
  }
);
var R0 = (o) => (0, import_jsx_runtime.jsx)(
  "rect",
  {
    x: 40,
    y: 0,
    width: 20,
    height: 100,
    ...o
  }
);
var B0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 0 100 L 20 100 L 20 60 C 20 20 40 20 40 50 L 40 100 L 60 100 L 60 50 C 60 20 80 20 80 50 L 80 100 L 100 100 L 100 50 C 100 -10 40 -10 50 50 C 50 -5 20 -5 20 20 L 20 0 L 0 0",
    ...o
  }
);
var F0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 0 100 L 20 100 L 20 60 C 20 0 80 0 80 50 L 80 100 L 100 100 L 100 25 C 80 -10 20 -10 20 20 L 20 0 L 0 0",
    ...o
  }
);
var G0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 20 100 L 0 100 L 0 0 L 20 0 L 20 20 C 10 -10 90 -10 100 30 L 100 40 C 90 90 10 90 20 60 L 20 60 L 20 100",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 79 40 C 80 5 20 5 20 35 C 20 70 80 70 79 35", fill: "#ffffff" })
] });
var I0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 80 100 L 100 100 L 100 0 L 80 0 L 80 20 C 90 -10 10 -10 0 30 L 0 40 C 10 90 90 90 80 60 L 80 60 L 80 100",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { d: "M 79 40 C 80 5 20 5 20 35 C 20 70 80 70 79 35", fill: "#ffffff" })
] });
var Y0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 0 100 L 20 100 L 20 60 C 20 0 80 0 80 50 L 100 50 L 100 25 C 80 -10 20 -10 20 20 L 20 0 L 0 0",
    ...o
  }
);
var D0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 95 68 C 80 117 20 105 20 63 L 20 47 L 7 47 L 7 27 L 20 27 L 20 0 L 45 0 L 45 27 L 57 27 L 57 47 L 45 47 L 45 63 C 45 90 70 90 75 68 L 95 68",
    ...o
  }
);
var H0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 0 0 L 0 60 C 0 111 100 111 100 60 L 100 0 L 75 0 L 75 60 C 80 90 20 90 25 60 L 25 0 L 0 0",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)(
    "rect",
    {
      ...o,
      x: 75,
      y: 0,
      height: 100,
      width: 25
    }
  )
] });
var b0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    d: "M 0 0 L 25 0 L 50 36 L 75 0 L 100 0 L 40 100 L 12 100 L 37 55 L 0 0",
    ...o
  }
);
function j0(o) {
  return (0, import_jsx_runtime.jsx)(
    "path",
    {
      ...o,
      d: "M 0 80 L 0 100 L 100 100 L 100 80 L 68 80 L 68 0 L 32 0 L 0 15 L 0 40 L 32 25 L 32 80 L 0 80"
    }
  );
}
var Q0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 0 25 C 20 -8 80 -8 100 25 C 100 90 30 50 20 85 L 100 85 L 100 100 L 0 100 L 0 70 C 10 40 75 70 75 25 C 70 10 30 10 25 28 L 0 25"
  }
);
var U0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 0 35 L 0 25 C 20 -8 80 -8 100 25 C 100 30 100 50 75 50 C 100 50 100 70 100 75 C 80 108 20 108 0 75 L 0 65 L 25 65 L 25 75 C 30 88 70 88 75 75 C 75 68 75 65 47 58 L 47 42 C 75 32 75 35 75 25 C 70 12 30 12 25 25 L 25 35"
  }
);
var W0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 50 0 L 0 50 L 0 70 L 50 70 L 50 100 L 75 100 L 75 70 L 100 70 L 100 50 L 75 50 L 75 0 L 50 15 L 50 50 L 30 50 L 75 0 L 50 0"
  }
);
var X0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 95 20 L 100 0 L 10 0 L 0 60 L 25 60 C 30 45 90 50 75 77 C 66 87 30 90 26 72 L 0 80 C 20 110 80 110 100 70 C 100 25 10 25 25 40 L 30 20 L 95 20"
  }
);
var K0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 50 0 C -40 70 10 100 50 100 C 90 100 100 80 100 55 C 80 30 30 30 35 50 L 30 60 C 80 50 80 85 50 80 C 10 80 48 10 90 0 L 50 0"
  }
);
var V0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 0 0 L 100 0 L 50 100 L 20 100 L 60 20 L 0 20 L 0 0"
  }
);
var Z0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      ...o,
      d: "M 0 35 L 0 25 C 20 -8 80 -8 100 25 C 100 30 100 50 75 50 C 100 50 100 70 100 75 C 80 108 20 108 0 75 L 0 65 L 25 65 L 25 75 C 30 88 70 88 75 75 C 75 68 75 65 47 58 L 47 42 C 75 32 75 35 75 25 C 70 12 30 12 25 25 L 25 35"
    }
  ),
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      ...o,
      d: "M 100 35 L 100 25 C 80 -8 20 -8 0 25 C 0 30 0 50 25 50 C 0 50 0 70 0 75 C 20 108 80 108 100 75 L 100 65 L 75 65 L 75 75 C 70 88 30 88 25 75 C 25 68 25 65 53 58 L 53 42 C 25 32 25 35 25 25 C 30 12 70 12 75 25 L 75 35"
    }
  )
] });
var J0 = (o) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    ...o,
    d: "M 50 100 C 140 30 90 0 50 0 C 10 0 0 20 0 45 C 20 70 70 70 65 50 L 70 40 C 20 50 20 15 50 20 C 90 20 52 90 10 100 L 50 100"
  }
);
var z = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      ...o,
      d: "M 0 100 L 33 0 L 66 0 L 100 100 L 75 100 L 66 75 L 33 75 L 25 100 L 0 100"
    }
  ),
  (0, import_jsx_runtime.jsx)("path", { fill: "#ffffff", d: "M 41 55 L 50 25 L 58 55 L 41 55" })
] });
var q0 = `M 0 0 L 80 0 C 105 0 105 50 80 50
         C 105 50 105 100 80 100 L 00 100
         L 0 0`;
var n0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)("path", { ...o, d: q0 }),
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15",
      fill: "#ffffff"
    }
  ),
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M 20 65 L 70 65 C 80 65 80 85 70 85 L 20 85 L 20 65",
      fill: "#ffffff"
    }
  )
] });
var $0 = `M 100 28 C 100 -13 0 -13 0 50
         C 0 113 100 113 100 72 L 75 72
         C 75 90 30 90 30 50 C 30 10 75 10 75 28
         L 100 28`;
var v = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: $0 });
var P0 = `M 0 0 L 60 0 C 110 0 110 100 60 100
               L 0 100 L 0 0`;
var oo = `M 20 15 L 40 15 C 85 15 85 85 40 85
                    L 20 85 L 20 15`;
var r0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)("path", { ...o, d: P0 }),
  (0, import_jsx_runtime.jsx)("path", { fill: "#ffffff", d: oo })
] });
var eo = `M 0 0 L 100 0 L 100 20 L 20 20 L 20 40
               L 90 40 L 90 60 L 20 60 L 20 80 L 100 80
               L 100 100 L 0 100 L 0 0`;
var c0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: eo });
var to = `M 0 0 L 100 0 L 100 20 L 20 20 L 20 40
               L 80 40 L 80 60 L 20 60 L 20 100 L 0 100
               L 0 0`;
var L0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: to });
var no = `M 100 28 C 100 -13 0 -13 0 50 C 0 113 100 113 100 72
         L 100 48 L 55 48 L 55 72 L 75 72 C 75 90 30 90 30 50
         C 30 10 75 5 75 28 L 100 28`;
var R = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: no });
var ro = `M 0 0 L 20 0 L 20 40 L 80 40 L 80 0
               L 100 0 L 100 100 L 80 100 L 80 60
               L 20 60 L 20 100 L 0 100 L 0 0`;
var l0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: ro });
var co = "M 40 0 L 60 0 L 60 100 L 40 100 L 40 0";
var g0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: co });
var Lo = `M 0 60 C 0 111 100 111 100 60
         L 100 0 L 75 0 L 75 60
         C 80 90 20 90 25 60`;
var lo = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: Lo });
var go = `M 0 0 L 20 0 L 20 40 L 75 0 L 100 0
               L 50 50 L 100 100 L 75 100 L 30 65
               L 20 75 L 20 100 L 0 100 L 0 0`;
var h0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: go });
var ho = `M 0 0 L 0 100 L 100 100 L 100 80
               L 20 80 L 20 0 L 0 0`;
var s0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: ho });
var so = `M 0 0 L 20 0 L 50 35 L 80 0 L 100 0 L 100 100
               L 80 100 L 80 30 L 50 65 L 20 30 L 20 100
               L 0 100 L 0 0`;
var i0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: so });
var io = `M 0 100 L 0 0 L 20 0 L 80 75 L 80 0
         L 100 0 L 100 100 L 80 100 L 20 25 L 20 100 L 0 100`;
var f0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: io });
var Y = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "circle",
    {
      cx: "50",
      cy: "50",
      r: "50",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("circle", { cx: "50", cy: "50", r: "32", fill: "#ffffff" })
] });
var fo = `M 0 0 L 80 0 C 105 0 105 50 80 50
               L 20 50 L 20 100 L 0 100 L 0 0`;
var a0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)("path", { ...o, d: fo }),
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      fill: "#ffffff",
      d: "M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15"
    }
  )
] });
var ao = "M 85 100 L 55 70 L 70 55 L 100 85 L 85 100";
var m0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)(
    "circle",
    {
      cx: "50",
      cy: "50",
      r: "50",
      ...o
    }
  ),
  (0, import_jsx_runtime.jsx)("circle", { cx: "50", cy: "50", r: "32", fill: "#ffffff" }),
  (0, import_jsx_runtime.jsx)("path", { d: ao, ...o })
] });
var mo = `M 0 0 L 80 0 C 105 0 105 50 80 50
                C 100 50 100 70 100 70 L 100 100 L 80 100
                L 80 80 C 80 80 80 60 50 60 L 20 60
                L 20 100 L 0 100 L 0 0`;
var d0 = (o) => (0, import_jsx_runtime.jsxs)("g", { children: [
  (0, import_jsx_runtime.jsx)("path", { ...o, d: mo }),
  (0, import_jsx_runtime.jsx)(
    "path",
    {
      fill: "#ffffff",
      d: "M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15"
    }
  )
] });
var po = "M92 26 A43 20 0 1 0 43 46 A42 23 0 1 1 9 68";
var H = ({ fill: o, fillOpacity: n }) => (0, import_jsx_runtime.jsx)(
  "path",
  {
    fill: "#ffffff",
    stroke: o,
    strokeOpacity: n,
    strokeWidth: "18",
    d: po
  }
);
var xo = `M 0 0 L 0 20 L 35 20 L 35 100
         L 65 100 L 65 20 L 100 20
         L 100 0 L 0 0`;
var W = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: xo });
var Co = `M 0 0 L 0 60 C 0 111 100 111 100 60
         L 100 0 L 75 0 L 75 60
         C 80 90 20 90 25 60 L 25 0 L 0 0`;
var X = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: Co });
var Mo = `M 0 0 L 20 0 L 50 80 L 80 0
               L 100 0 L 60 100 L 40 100 L 0 0`;
var b = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: Mo });
var uo = `M 0 0 L 20 0 L 30 70 L 50 30 L 70 70 L 80 0
               L 100 0 L 90 100 L 70 100 L 50 65 L 30 100
               L 10 100 L 0 0`;
var j = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: uo });
var yo = `M 0 0 L 20 0 L 50 40 L 80 0 L 100 0 L 70 50
               L 100 100 L 80 100 L 50 60 L 20 100 L 0 100
               L 30 50 L 0 0`;
var o0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: yo });
var ko = `M 0 0 L 20 0 L 50 45 L 80 0 L 100 0
               L 60 60 L 60 100 L 40 100 L 40 60 L 0 0`;
var p0 = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: ko });
var _o = `M 0 0 L 100 0 L 100 20 L 35 80 L 100 80
               L 100 100 L 0 100 L 0 80 L 65 20 L 0 20
               L 0 0`;
var Q = (o) => (0, import_jsx_runtime.jsx)("path", { ...o, d: _o });
function Ao({ xscale: o, yscale: n, inverted: r, children: t }) {
  const c = n * (r ? -1 : 1);
  return (0, import_jsx_runtime.jsx)("g", { transform: "scale(" + o + "," + c + ")", children: t });
}
var No = ({
  height: o,
  width: n,
  indices: r,
  alphabet: t,
  lv: c,
  transform: L,
  alpha: g,
  inverted: d,
  onSymbolMouseOver: i,
  onSymbolMouseOut: f,
  onSymbolClick: s
}) => {
  let x = o, C = n / 100;
  g = g || 1;
  let M = r.map((l) => {
    if (!t[l] || !t[l].component || c[l] === 0)
      return null;
    x -= c[l] * 100;
    const p = d ? x + c[l] * 100 : x;
    let u = C * 0.8 / t[l].component.length;
    return t[l].component.map((_, a) => (0, import_jsx_runtime.jsx)(
      "g",
      {
        transform: "translate(" + (a * n * 0.8 / t[l].component.length + n * 0.1) + "," + p + ")",
        onMouseOver: () => {
          i && i({
            component: [t[l].component[a]],
            regex: [t[l].regex[a]],
            color: t[l].color && [t[l].color[a]]
          });
        },
        onMouseOut: f && (() => f({
          component: [t[l].component[a]],
          regex: [t[l].regex[a]],
          color: t[l].color && [t[l].color[a]]
        })),
        onClick: s && (() => s({
          component: [t[l].component[a]],
          regex: [t[l].regex[a]],
          color: t[l].color && [t[l].color[a]]
        })),
        children: (0, import_jsx_runtime.jsx)(Ao, { xscale: u, yscale: c[l], inverted: d || false, children: (0, import_jsx_runtime.jsx)(
          _,
          {
            fill: t[l].color && t[l].color[a] || "#000000",
            fillOpacity: g,
            ...t[l]
          }
        ) })
      },
      l + "_" + a
    ));
  });
  return (0, import_jsx_runtime.jsx)("g", { transform: L, children: M });
};
var wo = (o, n) => (r) => n[0] + (n[1] - n[0]) * ((r - o[0]) / (o[1] - o[0]));
var x0 = ({
  minrange: o,
  maxrange: n,
  xstart: r,
  width: t,
  height: c,
  xaxis_y: L,
  numberofgridlines: g,
  stroke: d
}) => {
  const i = wo([o, n], [r, t]), f = n - o, s = L + c, x = Math.ceil(f) / g, C = Math.ceil(f / x), M = Array.from(Array(C).keys());
  return (0, import_jsx_runtime.jsxs)("g", { stroke: d || "#000000", children: [
    M.map((l) => {
      const p = o + x * l;
      return (0, import_jsx_runtime.jsx)("line", { x1: i(p), x2: i(p), y1: L, y2: s }, l);
    }),
    (0, import_jsx_runtime.jsx)("line", { x1: i(n), x2: i(n), y1: L, y2: s }),
    ";"
  ] });
};
var jo = "INFORMATION_CONTENT";
var D = "FREQUENCY";
var e0 = [
  { component: [z], regex: ["A"], color: ["red"] },
  { component: [n0], regex: ["B"], color: ["maroon"] },
  { component: [v], regex: ["C"], color: ["blue"] },
  { component: [r0], regex: ["D"], color: ["green"] },
  { component: [c0], regex: ["E"], color: ["olive"] },
  { component: [L0], regex: ["F"], color: ["navy"] },
  { component: [R], regex: ["G"], color: ["orange"] },
  { component: [l0], regex: ["H"], color: ["teal"] },
  { component: [g0], regex: ["I"], color: ["cadetblue"] },
  { component: [lo], regex: ["J"], color: ["lavender"] },
  { component: [h0], regex: ["K"], color: ["chocolate"] },
  { component: [s0], regex: ["L"], color: ["coral"] },
  { component: [i0], regex: ["M"], color: ["darkolivegreen"] },
  { component: [f0], regex: ["N"], color: ["darkorange"] },
  { component: [Y], regex: ["O"], color: ["gold"] },
  { component: [a0], regex: ["P"], color: ["darkorchid"] },
  { component: [m0], regex: ["Q"], color: ["darkslateblue"] },
  { component: [d0], regex: ["R"], color: ["firebrick"] },
  { component: [H], regex: ["S"], color: ["darkslategrey"] },
  { component: [W], regex: ["T"], color: ["#228b22"] },
  { component: [X], regex: ["U"], color: ["seagreen"] },
  { component: [b], regex: ["V"], color: ["indigo"] },
  { component: [j], regex: ["W"], color: ["mediumseagreen"] },
  { component: [o0], regex: ["X"], color: ["black"] },
  { component: [p0], regex: ["Y"], color: ["palevioletred"] },
  { component: [Q], regex: ["Z"], color: ["peru"] },
  { component: [_0], regex: ["a"], color: ["red"] },
  { component: [A0], regex: ["b"], color: ["maroon"] },
  { component: [v], regex: ["c"], color: ["purple"] },
  { component: [N0], regex: ["d"], color: ["green"] },
  { component: [w0], regex: ["e"], color: ["olive"] },
  { component: [E0], regex: ["f"], color: ["navy"] },
  { component: [S0], regex: ["g"], color: ["orange"] },
  { component: [v0], regex: ["h"], color: ["teal"] },
  { component: [O0], regex: ["i"], color: ["cadetblue"] },
  { component: [T0], regex: ["j"], color: ["lavender"] },
  { component: [z0], regex: ["k"], color: ["chocolate"] },
  { component: [R0], regex: ["l"], color: ["coral"] },
  { component: [B0], regex: ["m"], color: ["darkolivegreen"] },
  { component: [F0], regex: ["n"], color: ["darkorange"] },
  { component: [Y], regex: ["o"], color: ["gold"] },
  { component: [G0], regex: ["p"], color: ["darkorchid"] },
  { component: [I0], regex: ["q"], color: ["darkslateblue"] },
  { component: [Y0], regex: ["r"], color: ["firebrick"] },
  { component: [H], regex: ["s"], color: ["darkslategrey"] },
  { component: [D0], regex: ["t"], color: ["#228b22"] },
  { component: [H0], regex: ["u"], color: ["seagreen"] },
  { component: [b], regex: ["v"], color: ["indigo"] },
  { component: [j], regex: ["w"], color: ["mediumseagreen"] },
  { component: [o0], regex: ["x"], color: ["black"] },
  { component: [b0], regex: ["y"], color: ["palevioletred"] },
  { component: [Q], regex: ["z"], color: ["peru"] },
  { component: [Y], regex: ["0"], color: ["indianred"] },
  { component: [j0], regex: ["1"], color: ["red"] },
  { component: [Q0], regex: ["2"], color: ["green"] },
  { component: [U0], regex: ["3"], color: ["purple"] },
  { component: [W0], regex: ["4"], color: ["navy"] },
  { component: [X0], regex: ["5"], color: ["teal"] },
  { component: [K0], regex: ["6"], color: ["gold"] },
  { component: [V0], regex: ["7"], color: ["olive"] },
  { component: [Z0], regex: ["8"], color: ["slate"] },
  { component: [J0], regex: ["9"], color: ["firebrick"] }
];
var C0 = (o, n) => {
  let r = ("" + o).length;
  for (let t = o + 1; t < o + n; ++t)
    ("" + t).length > r && (r = ("" + t).length);
  return r;
};
var t0 = (() => {
  let o = {};
  return e0.forEach((n, r) => {
    n.regex.forEach((t) => {
      o[t] = e0[r];
    });
  }), o;
})();
var M0 = (o) => o.map((n) => {
  if (n.regex.length === 1)
    return Object.assign({}, n, {
      component: t0[n.regex[0]].component
    });
  const r = "#000000";
  let t = Object.assign({}, n, { component: [], color: [] });
  for (let c = 0; c < t.regex.length; ++c)
    t.component.push(t0[t.regex[c]].component[0]), t.color.push(n.color && n.color[c] || r);
  return t;
});
var Eo = (o) => (n, r) => {
  let t = 0, c = r || 0;
  return n.map(
    (L, g) => t += L === 0 ? 0 : L * Math.log2(L / (o[g] || 0.01))
  ), n.map((L) => {
    const g = L * (t - c);
    return g <= 0 ? 0 : g;
  });
};
var So = (o) => o.map((r, t) => t).sort((r, t) => o[r] < o[t] ? -1 : o[r] === o[t] ? 0 : 1);
var vo = (o) => o.map((r, t) => t).sort((r, t) => o[r] < o[t] ? 1 : o[r] === o[t] ? 0 : -1);
var K = (o) => {
  let n = [];
  for (let r = 0; r < Math.floor(o); r++)
    n.push(r);
  return n;
};
var Oo = (o) => {
  let n = 0;
  return o.filter((r) => r > 0).forEach((r) => {
    n += r;
  }), n;
};
var To = (o) => {
  let n = 0;
  return o.filter((r) => r < 0).forEach((r) => {
    n += r;
  }), n;
};
var u0 = ({
  n: o,
  transform: n,
  glyphWidth: r,
  startPos: t
}) => {
  const c = K(o);
  return (0, import_jsx_runtime.jsx)("g", { transform: n, children: (0, import_jsx_runtime.jsx)("g", { transform: "rotate(-90)", children: c.map((L) => (0, import_jsx_runtime.jsx)(
    "text",
    {
      x: "0",
      y: r * (L + 0.66),
      fontSize: "18",
      textAnchor: "end",
      children: L + (t || 0)
    },
    L
  )) }) });
};
var zo = (o) => {
  const n = K(o.bits + 1), r = o.zeroPoint || 1;
  return (0, import_jsx_runtime.jsxs)("g", { transform: o.transform, children: [
    (0, import_jsx_runtime.jsx)(
      "rect",
      {
        height: o.height * r,
        width: 4,
        x: o.width + 1,
        y: 0,
        fill: "#000000"
      }
    ),
    n.map((t) => (0, import_jsx_runtime.jsxs)(
      "g",
      {
        transform: "translate(0," + (o.height * r - Math.floor(t * (o.height * r) / o.bits)) + ")",
        children: [
          (0, import_jsx_runtime.jsx)("text", { x: o.width - 15, textAnchor: "end", y: "4", fontSize: "18", children: t }),
          (0, import_jsx_runtime.jsx)(
            "rect",
            {
              x: o.width - 10,
              width: "15",
              height: "4",
              y: "-2",
              fill: "#000000"
            }
          )
        ]
      },
      t
    )),
    (0, import_jsx_runtime.jsx)("g", { transform: "rotate(-90)", children: (0, import_jsx_runtime.jsx)(
      "text",
      {
        y: "20",
        x: -(o.height * r) / 2,
        textAnchor: "middle",
        fontSize: "18",
        children: "bits"
      }
    ) })
  ] });
};
var Ro = (o) => {
  const n = K(o.ticks + 1).map((r) => r / o.ticks);
  return (0, import_jsx_runtime.jsxs)("g", { transform: o.transform, children: [
    (0, import_jsx_runtime.jsx)(
      "rect",
      {
        height: o.height,
        width: 4,
        x: o.width + 1,
        y: "0",
        fill: "#000000"
      }
    ),
    n.map((r) => (0, import_jsx_runtime.jsxs)(
      "g",
      {
        transform: "translate(0," + (o.height - Math.floor(r * o.height)) + ")",
        children: [
          (0, import_jsx_runtime.jsx)("text", { x: o.width - 10, textAnchor: "end", y: "4", fontSize: "18", children: (r + "").substring(0, 4) }),
          (0, import_jsx_runtime.jsx)(
            "rect",
            {
              x: o.width - 5,
              width: "10",
              height: "4",
              y: "-2",
              fill: "#000000"
            }
          )
        ]
      },
      r
    )),
    (0, import_jsx_runtime.jsx)("g", { transform: "rotate(-90)", children: (0, import_jsx_runtime.jsx)("text", { y: "15", x: -o.height / 2, textAnchor: "middle", fontSize: "18", children: "frequency" }) })
  ] });
};
var Bo = ({
  transform: o,
  min: n,
  max: r,
  width: t,
  height: c
}) => {
  const L = [n, 0, r];
  return (0, import_jsx_runtime.jsxs)("g", { transform: o, children: [
    (0, import_jsx_runtime.jsx)(
      "rect",
      {
        height: (c - (n < 0 ? n : 0) / r * c) / 2,
        width: 4,
        x: t + 1,
        y: "0",
        fill: "#000000"
      }
    ),
    L.map((g) => (0, import_jsx_runtime.jsxs)(
      "g",
      {
        transform: "translate(0," + (c - g / r * c) / 2 + ")",
        children: [
          (0, import_jsx_runtime.jsx)("text", { x: t - 10, textAnchor: "end", y: "4", fontSize: "18", children: (g + "").substring(0, 4) }),
          (0, import_jsx_runtime.jsx)("rect", { x: t - 5, width: "10", height: "4", y: "-2", fill: "#000000" })
        ]
      },
      g
    )),
    (0, import_jsx_runtime.jsx)("g", { transform: "rotate(-90)", children: (0, import_jsx_runtime.jsx)(
      "text",
      {
        y: "15",
        x: -((c - (n < 0 ? n : 0) / r * c) / 2) / 2,
        textAnchor: "middle",
        fontSize: "18",
        children: "frequency"
      }
    ) })
  ] });
};
var U = (o, n, r, t) => (c, L, g, d, i, f) => {
  const s = f ? vo(c) : So(c), { onSymbolMouseOver: x, onSymbolMouseOut: C, onSymbolClick: M } = d;
  return (0, import_jsx_runtime.jsx)(
    No,
    {
      indices: s,
      alphabet: g,
      alpha: r,
      onSymbolMouseOver: (l) => x && x(l),
      onSymbolClick: (l) => M && M(l),
      onSymbolMouseOut: (l) => C && C(l),
      lv: c,
      transform: i,
      width: o,
      height: n,
      inverted: t
    },
    L
  );
};
var Fo = ({
  values: o,
  glyphWidth: n,
  stackHeight: r,
  alphabet: t,
  onSymbolMouseOver: c,
  onSymbolMouseOut: L,
  onSymbolClick: g
}) => {
  const d = U(n, r);
  for (const f in t)
    if (!t[f].component) {
      t = M0(t);
      break;
    }
  return o.map(
    (f, s) => d(
      f,
      s,
      t,
      { onSymbolMouseOver: c, onSymbolMouseOut: L, onSymbolClick: g },
      "translate(" + n * s + ",0)"
    )
  );
};
var y0 = (o, n, r) => {
  const t = [], c = Math.max(...r.map((L) => L.length));
  for (let L = 0; L < c; ++L)
    t.push(o.map((g) => 0));
  return r.forEach((L) => {
    for (let g = 0; g < L.length; ++g)
      n[L[g]] !== void 0 && ++t[g][n[L[g]]];
  }), {
    count: r.length,
    pfm: t
  };
};
var Go = (o, n) => {
  const r = {}, t = [];
  return o.forEach((c, L) => {
    c.regex.forEach((g) => {
      r[g] = L;
    });
  }), n.split(`
`).forEach((c) => {
    c[0] === ">" ? t.push("") : t[t.length - 1] += c.trim();
  }), y0(o, r, t);
};
var Io = (o, n) => {
  const r = {};
  return o.forEach((t, c) => {
    t.regex.forEach((L) => {
      r[L] = c;
    });
  }), y0(
    o,
    r,
    n.split(`
`).map((t) => t.trim())
  );
};
var V = ({
  ppm: o,
  pfm: n,
  values: r,
  fasta: t,
  mode: c,
  height: L,
  width: g,
  alphabet: d,
  glyphWidth: i,
  scale: f,
  startPos: s,
  showGridLines: x,
  backgroundFrequencies: C,
  constantPseudocount: M,
  smallSampleCorrectionOff: l,
  yAxisMax: p,
  onSymbolMouseOver: u,
  onSymbolMouseOut: _,
  onSymbolClick: a,
  noFastaNames: B,
  countUnaligned: O,
  svgRef: k
}) => {
  let y = null;
  const A = (n || t) && !M && !O ? !l : false, Z = A ? 0 : (M || 0) / d.length;
  if (!o && !n && t) {
    const m = (B ? Io : Go)(
      d,
      t.toUpperCase()
    );
    n = m.pfm, y = m.count || 1;
  }
  const J = A && n && n.map(
    (m) => m.reduce(
      (N, S, I) => I === void 0 ? N : S + N,
      0
    )
  ).map(
    (m) => m === 0 ? 0 : (d.length - 1) / (2 * Math.log(2) * m)
  );
  if (!o && n && (o = n.map((m) => {
    const N = (y && O ? y : m.reduce((S, I) => S + I, 0) + Z * d.length) || 1;
    return m.map((S) => (S + Z) / N);
  })), !o || o && (o.length === 0 || o[0].length === 0))
    return (0, import_jsx_runtime.jsx)("div", {});
  let F = o[0].length;
  C || (C = o[0].map((m) => 1 / F));
  let E = r || (c !== D ? o.map(
    (m, N) => Eo(C)(m, J ? J[N] : void 0)
  ) : o.map(
    (m) => m.map((N) => N * Math.log2(F))
  ));
  const q = c === D ? [Math.log2(F)] : C.map((m) => Math.log2(1 / (m || 0.01))), T = p || Math.max(...q), $ = Math.min(...q), k0 = $ < 0 ? T / (T - $) : 1;
  s = s && !isNaN(parseFloat(s.toString())) && isFinite(s) ? s : 1;
  let w = 100 * T;
  i = w / 6 * (i || 1);
  let G = E.length * i + 80, P = w + 18 * (C0(s, E.length) + 1);
  return f && (G > P ? g = f : L = f), (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: g,
      height: L,
      viewBox: "0 0 " + G + " " + P,
      ref: k,
      children: [
        x && (0, import_jsx_runtime.jsx)(
          x0,
          {
            minrange: s,
            maxrange: s + o.length,
            xstart: 70,
            width: G,
            height: w,
            xaxis_y: 10,
            numberofgridlines: 10 * E.length
          }
        ),
        (0, import_jsx_runtime.jsx)(
          u0,
          {
            transform: "translate(80," + (w + 20) + ")",
            n: E.length,
            glyphWidth: i,
            startPos: s
          }
        ),
        c === D ? (0, import_jsx_runtime.jsx)(
          Ro,
          {
            transform: "translate(0,10)",
            width: 65,
            height: w,
            ticks: 2
          }
        ) : (0, import_jsx_runtime.jsx)(
          zo,
          {
            transform: "translate(0,10)",
            width: 65,
            height: w,
            bits: T,
            zeroPoint: k0
          }
        ),
        (0, import_jsx_runtime.jsx)("g", { transform: "translate(80,10)", children: (0, import_jsx_runtime.jsx)(
          Fo,
          {
            values: E,
            glyphWidth: i,
            stackHeight: w,
            alphabet: d,
            onSymbolMouseOver: u,
            onSymbolMouseOut: _,
            onSymbolClick: a
          }
        ) })
      ]
    }
  );
};
var Qo = ({
  values: o,
  height: n,
  width: r,
  alphabet: t,
  scale: c,
  startPos: L,
  negativealpha: g,
  showGridLines: d,
  inverted: i,
  onSymbolMouseOver: f,
  onSymbolMouseOut: s,
  onSymbolClick: x
}) => {
  if (o.length === 0 || o[0].length === 0)
    return (0, import_jsx_runtime.jsx)("div", {});
  for (const k in t)
    if (!t[k].component) {
      t = M0(t);
      break;
    }
  L = L ?? 1, g = g < 0 ? 0 : g, g = g > 255 ? 255 : g;
  let C = o.map(Oo), M = o.map((k) => -To(k)), l = Math.max(...C, ...M), p = 200, u = p / 6, _ = o.length * u + 80, a = p + 18 * (C0(L, o.length) + 1), B = U(u, p / 2.05), O = U(
    u,
    -p / 2.05,
    g / 255,
    i
  );
  return c && (_ > a ? r = c : n = c), (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: r,
      height: n,
      viewBox: "0 0 " + _ + " " + a,
      children: [
        d && (0, import_jsx_runtime.jsx)(
          x0,
          {
            minrange: L,
            maxrange: L + o.length,
            xstart: 70,
            width: _,
            height: p,
            xaxis_y: 10,
            numberofgridlines: 10 * o.length
          }
        ),
        (0, import_jsx_runtime.jsx)(
          u0,
          {
            transform: "translate(80," + (p + 20) + ")",
            n: o.length,
            glyphWidth: u,
            startPos: L
          }
        ),
        (0, import_jsx_runtime.jsx)(
          Bo,
          {
            transform: "translate(0,10)",
            width: 65,
            height: p,
            min: -l,
            max: l
          }
        ),
        (0, import_jsx_runtime.jsx)(
          "line",
          {
            style: {
              fill: "none",
              stroke: "#000000",
              strokeWidth: 2,
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              strokeOpacity: 1,
              strokeMiterlimit: 4,
              strokeDasharray: "0.53,1.59",
              strokeDashoffset: 0
            },
            transform: "translate(80," + (11 + p / 2) + ")",
            x1: 0,
            x2: _ - 80
          }
        ),
        (0, import_jsx_runtime.jsxs)("g", { transform: "translate(80,10)", children: [
          o.map(
            (k, y) => B(
              k.map((A) => A > 0 ? A / l : 0),
              y,
              t,
              { onSymbolMouseOver: f, onSymbolMouseOut: s, onSymbolClick: x },
              "translate(" + u * y + ",0)",
              false
            )
          ),
          o.map(
            (k, y) => O(
              k.map((A) => A < 0 ? A / l : 0),
              y,
              t,
              { onSymbolMouseOver: f, onSymbolMouseOut: s, onSymbolClick: x },
              "translate(" + u * y + "," + p + ")",
              true
            )
          )
        ] })
      ]
    }
  );
};
var Yo = [
  { component: [z], regex: ["A"], color: ["red"] },
  { component: [v], regex: ["C"], color: ["blue"] },
  { component: [R], regex: ["G"], color: ["orange"] },
  { component: [W], regex: ["T"], color: ["#228b22"] }
];
function Uo(o) {
  return (0, import_jsx_runtime.jsx)(V, { ...o, alphabet: Yo });
}
var Do = [
  { component: [z], regex: ["A"], color: ["black"] },
  { component: [n0], regex: ["B"], color: ["#bb8800"] },
  { component: [v], regex: ["C"], color: ["#008811"] },
  { component: [r0], regex: ["D"], color: ["#ff0000"] },
  { component: [c0], regex: ["E"], color: ["#ff0022"] },
  { component: [L0], regex: ["F"], color: ["#333333"] },
  { component: [R], regex: ["G"], color: ["#007700"] },
  { component: [l0], regex: ["H"], color: ["#220099"] },
  { component: [g0], regex: ["I"], color: ["#111111"] },
  { component: [h0], regex: ["K"], color: ["#002222"] },
  { component: [s0], regex: ["L"], color: ["#002222"] },
  { component: [i0], regex: ["M"], color: ["#220022"] },
  { component: [f0], regex: ["N"], color: ["#009911"] },
  { component: [a0], regex: ["P"], color: ["#080808"] },
  { component: [m0], regex: ["Q"], color: ["#00aa00"] },
  { component: [d0], regex: ["R"], color: ["#0022aa"] },
  { component: [H], regex: ["S"], color: ["#008f00"] },
  { component: [W], regex: ["T"], color: ["#006600"] },
  { component: [X], regex: ["U"], color: ["seagreen"] },
  { component: [b], regex: ["V"], color: ["#222200"] },
  { component: [j], regex: ["W"], color: ["#080808"] },
  { component: [p0], regex: ["Y"], color: ["#00a800"] },
  { component: [Q], regex: ["Z"], color: ["#aaaa00"] }
];
var Wo = (o) => (0, import_jsx_runtime.jsx)(V, { ...o, alphabet: Do });
var Ho = [
  { component: [z], regex: ["A"], color: ["red"] },
  { component: [v], regex: ["C"], color: ["blue"] },
  { component: [R], regex: ["G"], color: ["orange"] },
  { component: [X], regex: ["U"], color: ["seagreen"] }
];
var Xo = (o) => (0, import_jsx_runtime.jsx)(V, { ...o, alphabet: Ho });
export {
  z as A,
  n0 as B,
  v as C,
  e0 as CompleteAlphabet,
  r0 as D,
  Yo as DNAAlphabet,
  Uo as DNALogo,
  c0 as E,
  L0 as F,
  D as FREQUENCY,
  R as G,
  Ao as Glyph,
  No as GlyphStack,
  l0 as H,
  g0 as I,
  jo as INFORMATION_CONTENT,
  lo as J,
  h0 as K,
  s0 as L,
  V as Logo,
  Qo as LogoWithNegatives,
  i0 as M,
  f0 as N,
  j0 as N1,
  Q0 as N2,
  U0 as N3,
  W0 as N4,
  X0 as N5,
  K0 as N6,
  V0 as N7,
  Z0 as N8,
  J0 as N9,
  Y as O,
  a0 as P,
  Do as ProteinAlphabet,
  Wo as ProteinLogo,
  m0 as Q,
  d0 as R,
  Ho as RNAAlphabet,
  Xo as RNALogo,
  Fo as RawLogo,
  H as S,
  W as T,
  X as U,
  b as V,
  j as W,
  o0 as X,
  u0 as XAxis,
  p0 as Y,
  zo as YAxis,
  Ro as YAxisFrequency,
  Bo as YAxisWithNegatives,
  x0 as YGridlines,
  Q as Z,
  _0 as a,
  A0 as b,
  N0 as d,
  w0 as e,
  E0 as f,
  S0 as g,
  v0 as h,
  O0 as i,
  T0 as j,
  z0 as k,
  R0 as l,
  B0 as m,
  F0 as n,
  G0 as p,
  I0 as q,
  Y0 as r,
  D0 as t,
  H0 as u,
  b0 as y
};
/*! Bundled license information:

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=logo-test.js.map
