import { Meta, StoryObj } from "@storybook/react-vite";
import PackTranscript from "../../components/tracks/transcript/pack";
import { TranscriptList } from "../../components/tracks/transcript/types";

const meta: Meta<typeof PackTranscript> = {
  title: "Transcript/Pack",
  component: PackTranscript,
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
type Story = StoryObj<typeof PackTranscript>;

const TEST_TRANSCRIPTS: TranscriptList[] = [
  {
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
            UTRs: [
              {
                coordinates: { start: 100, end: 250 },
              },
            ],
          },
          {
            coordinates: {
              start: 350,
              end: 500,
            },
            UTRs: [
              {
                coordinates: { start: 450, end: 500 },
              },
            ],
          },
        ],
      },
    ],
    strand: "+",
  },
  {
    transcripts: [
      {
        name: "GENE2-101",
        id: "GENE2-101",
        strand: "-",
        coordinates: {
          start: 700,
          end: 900,
        },
        exons: [
          {
            coordinates: {
              start: 700,
              end: 800,
            },
            UTRs: [
              {
                coordinates: { start: 700, end: 730 },
              },
            ],
          },
          {
            coordinates: {
              start: 850,
              end: 900,
            },
          },
        ],
      },
    ],
    strand: "-",
  },
];

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

export const Basic: Story = {
  args: {
    id: "test_transcripts",
    height: 50,
    data: TEST_TRANSCRIPTS,
    dimensions: {
      totalWidth: 1000,
      multiplier: 1,
      viewWidth: 1000,
      sideWidth: 0,
      sidePortion: 0,
    },
  },
};

export const Overlapping: Story = {
  args: {
    id: "test_transcripts_overlapping",
    data: TEST_TRANSCRIPTS_OVERLAPPING,
    height: 35,
    dimensions: {
      totalWidth: 1000,
      multiplier: 1,
      viewWidth: 1000,
      sideWidth: 0,
      sidePortion: 0,
    },
  },
};

export const Red: Story = {
  args: {
    id: "test_transcripts_red",
    data: TEST_TRANSCRIPTS,
    color: "#880000",
    dimensions: {
      totalWidth: 1000,
      multiplier: 1,
      viewWidth: 1000,
      sideWidth: 0,
      sidePortion: 0,
    },
  },
};
