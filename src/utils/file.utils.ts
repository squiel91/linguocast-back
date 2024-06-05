import axios from 'axios'
import { createWriteStream, writeFile } from 'fs'
import { join } from 'path'

export const saveImageFromUrl = async (
  imageUrl: string,
  filePath: string
): Promise<void> => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' })
    const writer = createWriteStream(filePath)

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

export const saveFile = async (filePath: string, data: unknown) => {
  return new Promise((resolve, reject) => {
    writeFile(
      join(__dirname, filePath),
      JSON.stringify(data, null, 2),
      (err) => {
        if (err) {
          reject(`Error writing file: ${filePath}`)
          console.error('Error writing file:', err)
        } else {
          resolve(`JSON data has been saved to ${filePath}`)
        }
      }
    )
  })
}
