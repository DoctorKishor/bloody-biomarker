import { z } from 'zod'

export const userSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    gender: z.enum(['male', 'female']).optional(),
    birthDate: z.string().optional(),
    age: z.number().optional(),
    bloodType: z.string().optional(),
    height: z.string().optional(),
})
