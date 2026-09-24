import {
  Component,
  createContext,
  forwardRef,
  memo,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createStore, useStore } from "zustand";
import { renderWithProbe, type Probe } from "../src";

let probe: Probe | undefined;

afterEach(() => {
  probe?.unmount();
  probe = undefined;
});

async function mount(ui: ReactNode) {
  probe = await renderWithProbe(ui);
  return probe;
}

describe("counts and reasons", () => {
  let bump = () => {};

  function Plain() {
    return <span />;
  }
  const StableMemo = memo(function StableMemo({ label }: { label: string }) {
    return <span>{label}</span>;
  });
  const FreshMemo = memo(function FreshMemo({ style }: { style: { color: string } }) {
    return <span style={style} />;
  });
  function Parent() {
    const [count, setCount] = useState(0);
    bump = () => setCount((value) => value + 1);
    return (
      <div data-count={count}>
        <Plain />
        <StableMemo label="stable" />
        <FreshMemo style={{ color: "red" }} />
      </div>
    );
  }

  it("reports the mount with every instance mounting", async () => {
    const { mounted } = await mount(<Parent />);

    expect(mounted.counts).toEqual({ FreshMemo: 1, Parent: 1, Plain: 1, StableMemo: 1 });
    expect(mounted.why("Plain")).toEqual([{ instance: "Plain#0", renders: 1, because: ["mount"] }]);
  });

  it("counts committed renders, includes zeros, and explains each render", async () => {
    const { measure } = await mount(<Parent />);

    const report = await measure(() => bump());

    expect(report.counts).toEqual({ FreshMemo: 1, Parent: 1, Plain: 1, StableMemo: 0 });
    expect(Object.keys(report.counts)).toEqual(["FreshMemo", "Parent", "Plain", "StableMemo"]);
    expect(report.why("Parent")).toEqual([
      { instance: "Parent#0", renders: 1, because: ["state"] },
    ]);
    expect(report.why("Plain")[0].because).toEqual(["parent"]);
    expect(report.why("FreshMemo")[0].because).toEqual(["props.style"]);
    expect(report.why("StableMemo")).toEqual([]);
  });

  it("picks named components in sorted order and rejects unknown names", async () => {
    const { measure } = await mount(<Parent />);

    const report = await measure(() => bump());

    expect(report.pick("StableMemo", "Parent")).toEqual({ Parent: 1, StableMemo: 0 });
    expect(Object.keys(report.pick("StableMemo", "Parent"))).toEqual(["Parent", "StableMemo"]);
    expect(() => report.pick("Missing")).toThrow('"Missing" did not render');
  });

  it("prints a readable table", async () => {
    const { measure } = await mount(<Parent />);

    const report = await measure(() => bump());

    expect(String(report)).toMatchInlineSnapshot(`
      "Component   Renders  Because
      FreshMemo         1  FreshMemo#2 props.style
      Parent            1  Parent#0 state
      Plain             1  Plain#0 parent
      StableMemo        0"
    `);
  });

  it("batches updates within one action into one commit", async () => {
    const { measure } = await mount(<Parent />);

    const report = await measure(async () => {
      bump();
      await Promise.resolve();
      bump();
    });

    expect(report.pick("Parent", "Plain")).toEqual({ Parent: 1, Plain: 1 });
  });
});

describe("several commits in one window", () => {
  let bump = () => {};

  function Child() {
    return <span />;
  }
  function Even() {
    const [count, setCount] = useState(0);
    bump = () => setCount((value) => value + 1);
    useEffect(() => {
      if (count % 2 === 1) setCount(count + 1);
    }, [count]);
    return <Child />;
  }

  it("sums renders across commits and unions their reasons", async () => {
    const { measure } = await mount(<Even />);

    const report = await measure(() => bump());

    expect(report.counts).toEqual({ Child: 2, Even: 2 });
    expect(report.why("Even")).toEqual([{ instance: "Even#0", renders: 2, because: ["state"] }]);
  });
});

describe("names", () => {
  const Wrapped = memo(
    forwardRef<HTMLSpanElement>(function Wrapped(_props, ref) {
      return <span ref={ref} />;
    }),
  );
  const Compared = memo(
    function Compared() {
      return <span />;
    },
    () => false,
  );
  function Named() {
    return <span />;
  }
  Named.displayName = "DisplayName";
  const anonymous = [() => <span />][0];

  it("unwraps memo and forwardRef, prefers displayName, and labels anonymous components", async () => {
    const { mounted, rerender, measure } = await mount(
      <>
        <Wrapped />
        <Compared />
        <Named />
        {createElementOf(anonymous)}
      </>,
    );

    expect(mounted.counts).toEqual({ Anonymous: 1, Compared: 1, DisplayName: 1, Wrapped: 1 });
    const report = await measure(() =>
      rerender(
        <>
          <Wrapped />
          <Compared />
          <Named />
          {createElementOf(anonymous)}
        </>,
      ),
    );
    expect(report.counts).toEqual({ Anonymous: 1, Compared: 1, DisplayName: 1, Wrapped: 0 });
  });

  function createElementOf(Component: () => ReactNode) {
    return <Component />;
  }
});

describe("context", () => {
  const Theme = createContext("light");
  let setTheme: (theme: string) => void = () => {};

  const Consumer = memo(function Consumer() {
    return <span>{useContext(Theme)}</span>;
  });
  const Bystander = memo(function Bystander() {
    return <span />;
  });
  function Provider() {
    const [theme, set] = useState("light");
    setTheme = set;
    return (
      <Theme value={theme}>
        <Consumer />
        <Bystander />
      </Theme>
    );
  }

  it("reports a changed consumed context value", async () => {
    const { measure } = await mount(<Provider />);

    const report = await measure(() => setTheme("dark"));

    expect(report.counts).toEqual({ Bystander: 0, Consumer: 1, Provider: 1 });
    expect(report.why("Consumer")[0].because).toEqual(["context"]);
  });
});

describe("external stores", () => {
  const store = createStore<{ a: number; b: number }>()(() => ({ a: 0, b: 0 }));

  function ReadsA() {
    return <span>{useStore(store, (state) => state.a)}</span>;
  }
  function ReadsB() {
    return <span>{useStore(store, (state) => state.b)}</span>;
  }
  function App() {
    return (
      <>
        <ReadsA />
        <ReadsB />
      </>
    );
  }

  it("counts updates triggered from outside React and only the subscribed component", async () => {
    const { measure } = await mount(<App />);

    const report = await measure(() => store.setState({ a: 1 }));

    expect(report.counts).toEqual({ App: 0, ReadsA: 1, ReadsB: 0 });
    expect(report.why("ReadsA")[0].because).toEqual(["state"]);
  });
});

describe("class components", () => {
  let increment = () => {};

  class Counter extends Component<object, { count: number }> {
    state = { count: 0 };
    componentDidMount() {
      increment = () => this.setState(({ count }) => ({ count: count + 1 }));
    }
    render() {
      return <span>{this.state.count}</span>;
    }
  }

  it("reports class state changes", async () => {
    const { measure } = await mount(<Counter />);

    const report = await measure(() => increment());

    expect(report.why("Counter")).toEqual([
      { instance: "Counter#0", renders: 1, because: ["state"] },
    ]);
  });
});

describe("keyed instances", () => {
  function Item({ label }: { label: string }) {
    return <li>{label}</li>;
  }
  function List({ items }: { items: Record<string, string> }) {
    return (
      <ul>
        {Object.entries(items).map(([key, label]) => (
          <Item key={key} label={label} />
        ))}
      </ul>
    );
  }

  it("distinguishes instances by key and keeps components that unmount in the window", async () => {
    const { measure, rerender } = await mount(<List items={{ a: "A", b: "B", c: "C" }} />);

    const report = await measure(() => rerender(<List items={{ a: "A", b: "B2" }} />));

    expect(report.counts).toEqual({ Item: 2, List: 1 });
    expect(report.why("Item")).toEqual([
      { instance: "Item#a", renders: 1, because: ["parent"] },
      { instance: "Item#b", renders: 1, because: ["props.label"] },
    ]);
    expect(report.why("List")[0].because).toEqual(["props.items"]);
  });

  function Removed({ onMounted }: { onMounted: () => void }) {
    useEffect(onMounted, [onMounted]);
    return <span />;
  }
  let show = () => {};
  function Toggle() {
    const [visible, setVisible] = useState(false);
    show = () => setVisible(true);
    return visible ? <Removed onMounted={() => setVisible(false)} /> : null;
  }

  it("includes a component that rendered and then unmounted during the window", async () => {
    const { measure } = await mount(<Toggle />);

    const report = await measure(() => show());

    expect(report.counts).toEqual({ Removed: 1, Toggle: 2 });
    expect(report.why("Removed")).toEqual([
      { instance: "Removed#0", renders: 1, because: ["mount"] },
    ]);
  });
});

describe("async settling", () => {
  function Loader() {
    const [value, setValue] = useState("loading");
    useEffect(() => {
      void Promise.resolve("loaded").then(setValue);
    }, []);
    return <span>{value}</span>;
  }

  it("includes commits from promises that resolve right after an effect", async () => {
    const { mounted } = await mount(<Loader />);

    expect(mounted.counts).toEqual({ Loader: 2 });
    expect(mounted.why("Loader")[0].because).toEqual(["mount", "state"]);
  });

  function Fetcher({ id }: { id: number }) {
    const [value, setValue] = useState<number | null>(null);
    useEffect(() => {
      let current = true;
      void (async () => {
        await Promise.resolve();
        const next = await Promise.resolve(id * 10);
        if (current) setValue(next);
      })();
      return () => {
        current = false;
      };
    }, [id]);
    return <span>{value}</span>;
  }

  it("settles an async action whose effect sets state", async () => {
    const { measure, rerender } = await mount(<Fetcher id={1} />);

    const report = await measure(async () => {
      await Promise.resolve();
      rerender(<Fetcher id={2} />);
    });

    expect(report.counts).toEqual({ Fetcher: 2 });
    expect(report.why("Fetcher")[0].because).toEqual(["props.id", "state"]);
  });
});

describe("scope", () => {
  let bumpOther = () => {};

  function Other() {
    const [count, setCount] = useState(0);
    bumpOther = () => setCount((value) => value + 1);
    return <span>{count}</span>;
  }

  it("ignores commits from other React roots", async () => {
    const container = document.createElement("div");
    const otherRoot = createRoot(container);
    await act(async () => otherRoot.render(<Other />));
    const { measure } = await mount(<span />);

    const report = await measure(() => bumpOther());

    expect(report.counts).toEqual({});
    await act(async () => otherRoot.unmount());
  });

  it("allows only one probe at a time", async () => {
    await mount(<span />);

    await expect(renderWithProbe(<span />)).rejects.toThrow("another probe is still mounted");
  });

  it("allows a new probe after unmounting and removes the container", async () => {
    const first = await renderWithProbe(<span data-probe="first" />);
    first.unmount();

    expect(document.querySelector('[data-probe="first"]')).toBeNull();
    await mount(<span />);
  });
});
