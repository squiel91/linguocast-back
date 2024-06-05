import { sign } from 'jsonwebtoken'

export const generateAuthToken = (userId: number) => {
  return sign({ id: userId }, process.env.JWT_SECRET)
}
