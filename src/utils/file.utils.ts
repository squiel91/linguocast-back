import * as fs from 'fs'
import axios from 'axios'

export const saveImageFromUrl = async (
  imageUrl: string,
  filePath: string
): Promise<void> => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' })
    const writer = fs.createWriteStream(filePath)

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('Error saving image:', error)
    throw error
  }
}