import { Meta, StoryObj } from "@storybook/react-vite";
import FullBigWig from "../../components/tracks/bigwig/full";
import { BigWigData } from "../../components/tracks/bigwig/types";

const meta: Meta<typeof FullBigWig> = {
  title: "BigWig/Full",
  component: FullBigWig,
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

type Story = StoryObj<typeof FullBigWig>;

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

export const Full: Story = {
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
