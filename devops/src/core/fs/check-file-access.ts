import fs from 'node:fs/promises'

export const checkFileCanBeRead = async (path: string): Promise<boolean> => {
  return await fs
    .access(path, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false)
}
