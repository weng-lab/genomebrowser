import { Meta, StoryObj } from "@storybook/react-vite";
import DenseBigWig from "../../components/tracks/bigwig/dense";
import { BigWigData } from "../../components/tracks/bigwig/types";

const meta: Meta<typeof DenseBigWig> = {
  title: "BigWig/Dense",
  component: DenseBigWig,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <svg width={1000}>
        <Story />
      </svg>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof DenseBigWig>;

const TEST_DATA: BigWigData[] = (() => {
  const results: BigWigData[] = [];
  for (let i = 0; i < 1000; ++i) {
    results.push({
      start: i,
      end: i + 1,
      chr: "",
      value: Math.sin((i * 2.0 * Math.PI) / 100.0),
    });
  }
  return results;
})();

export const Dense: Story = {
  args: {
    height: 70,
    id: "test",
    color: "#5555FF",
    data: TEST_DATA,
    dimensions: {
      totalWidth: 1000,
      viewWidth: 1000,
      sideWidth: 0,
    },
  },
};
