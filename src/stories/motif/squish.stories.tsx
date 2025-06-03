import { Meta, StoryObj } from "@storybook/react-vite";
import SquishMotif from "../../components/tracks/motif/squish";

const meta: Meta<typeof SquishMotif> = {
  title: "Motif/Squish",
  component: SquishMotif,
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
type Story = StoryObj<typeof SquishMotif>;

export const Squish: Story = {
  args: {
    height: 35,
    dimensions: {
      totalWidth: 1000,
      viewWidth: 1000,
      sideWidth: 0,
    },
    data: {
      occurrenceRect: [
        {
          start: 200,
          end: 225,
          pwm: [
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
          ],
        },
      ],
      peaks: [
        {
          start: 50,
          end: 300,
          pwm: [
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
          ],
        },
        {
          start: 500,
          end: 650,
          pwm: [
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
          ],
        },
        {
          start: 100,
          end: 350,
          pwm: [
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0.8, 0.2, 0],
          ],
        },
      ],
    },
  },
};
