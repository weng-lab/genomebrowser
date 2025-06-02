import { Meta, StoryObj } from "@storybook/react-vite";
import SquishBigBed from "../../components/tracks/bigbed/squish";
import { Rect } from "../../components/tracks/bigbed/types";

const meta: Meta<typeof SquishBigBed> = {
  title: "BigBed/Squish",
  component: SquishBigBed,
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
type Story = StoryObj<typeof SquishBigBed>;

export const Squish: Story = {
  args: {
    height: 60,
    dimensions: {
      totalWidth: 1000,
      multiplier: 1,
      viewWidth: 1000,
      sideWidth: 0,
      sidePortion: 0,
    },
    data: [
      { start: 30, end: 100 },
      { start: 60, end: 100 },
      { start: 70, end: 110 },
      { start: 80, end: 120 },
      { start: 90, end: 130 },
      { start: 310, end: 400 },
      { start: 350, end: 440 },
      { start: 400, end: 490 },
      { start: 980, end: 1200 },
    ],
    color: "#000000",
    id: "test",
    onClick: () => {},
    onHover: () => {},
    onLeave: () => {},
    tooltip: (rect: Rect) => {
      return <div>{rect.name || "No name"}</div>;
    },
  },
};
