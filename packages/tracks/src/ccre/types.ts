import type { z } from "zod";
import type { BigBedRow } from "../bigbed/types";
import type { bedSchemas } from "../shared/bedSchemas";

export type CcreBigBedRow = BigBedRow & z.output<typeof bedSchemas.ccre>;
