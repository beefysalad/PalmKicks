import z from "zod";
export const brandsSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
export type TBrandsSchema = z.infer<typeof brandsSchema>;
