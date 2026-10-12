export interface User {
    id: string
    name?: string
    email?: string
    gender?: 'male' | 'female'
    birthDate?: string
    age?: number
    bloodType?: string
    height?: string
    createdAt: Date
    updatedAt: Date
}
