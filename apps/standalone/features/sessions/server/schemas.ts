import { z } from "zod";
import { SESSION_NAME_MAX_LENGTH } from "../rules";

export const sessionIdSchema = z.uuid();
export const sessionNameSchema = z.string().trim().min(1).max(SESSION_NAME_MAX_LENGTH);
