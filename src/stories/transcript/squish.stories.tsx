import { Meta, StoryObj } from "@storybook/react-vite";
import SquishTranscript from "../../components/tracks/transcript/squish";
import { TranscriptList } from "../../components/tracks/transcript/types";

const meta: Meta<typeof SquishTranscript> = {
  title: "Transcript/Squish",
  component: SquishTranscript,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      return (
        <svg width={1000}>
          <Story />
        </svg>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof SquishTranscript>;

const TEST_TRANSCRIPTS_OVERLAPPING: TranscriptList[] = [
  {
    id: "GENE1",
    name: "GENE1",
    transcripts: [
      {
        name: "GENE1-101",
        id: "GENE1-101",
        strand: "+",
        coordinates: {
          start: 100,
          end: 500,
        },
        exons: [
          {
            coordinates: {
              start: 100,
              end: 250,
            },
            UTRs: [{ coordinates: { start: 100, end: 220 } }],
          },
          {
            coordinates: {
              start: 350,
              end: 500,
            },
          },
        ],
      },
      {
        name: "GENE1-102",
        id: "GENE1-102",
        strand: "+",
        coordinates: {
          start: 100,
          end: 510,
        },
        exons: [
          {
            coordinates: {
              start: 80,
              end: 250,
            },
            UTRs: [{ coordinates: { start: 80, end: 150 } }],
          },
          {
            coordinates: {
              start: 350,
              end: 510,
            },
          },
        ],
      },
    ],
    strand: "+",
  },
  {
    id: "GENE2",
    name: "GENE2",
    transcripts: [
      {
        name: "GENE2-101",
        id: "GENE2-101",
        strand: "-",
        coordinates: {
          start: 400,
          end: 600,
        },
        exons: [
          {
            coordinates: {
              start: 400,
              end: 500,
            },
          },
          {
            coordinates: {
              start: 550,
              end: 600,
            },
          },
        ],
      },
    ],
    strand: "-",
  },
];

export const Default: Story = {
  args: {
    id: "test_densebigbed",
    color: "#880000",
    data: TEST_TRANSCRIPTS_OVERLAPPING,
    dimensions: {
      totalWidth: 1000,
      multiplier: 1,
      viewWidth: 1000,
      sideWidth: 0,
      sidePortion: 0,
    },
  },
};
